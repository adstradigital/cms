from decimal import Decimal
from io import BytesIO
from zipfile import ZIP_DEFLATED, ZipFile
import re
from xml.sax.saxutils import escape

from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.db.models import Count, Sum, Q, F
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Book, BookIssue, Rack, Shelf, LibrarySetting
from .serializers import (
    BookSerializer, 
    BookIssueSerializer, 
    RackSerializer, 
    ShelfSerializer, 
    LibrarySettingSerializer
)


class RackViewSet(viewsets.ModelViewSet):
    queryset = Rack.objects.all()
    serializer_class = RackSerializer
    permission_classes = [IsAuthenticated]


class ShelfViewSet(viewsets.ModelViewSet):
    queryset = Shelf.objects.select_related("rack").all()
    serializer_class = ShelfSerializer
    permission_classes = [IsAuthenticated]


class LibrarySettingViewSet(viewsets.ModelViewSet):
    queryset = LibrarySetting.objects.all()
    serializer_class = LibrarySettingSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "config_key"


def _get_library_report_data(report_type):
    if report_type == "issued":
        qs = BookIssue.objects.filter(status="issued").select_related("book", "student", "staff")
        return BookIssueSerializer(qs, many=True).data, None
    if report_type == "overdue":
        today = timezone.now().date()
        qs = BookIssue.objects.filter(
            Q(status="issued", due_date__lt=today) |
            Q(status="returned", return_date__isnull=False, return_date__gt=F("due_date"))
        ).select_related("book", "student", "staff")
        return BookIssueSerializer(qs, many=True).data, None
    if report_type == "fines":
        qs = BookIssue.objects.filter(fine_amount__gt=0).select_related("book", "student", "staff")
        return BookIssueSerializer(qs, many=True).data, None
    if report_type == "availability":
        qs = Book.objects.all().order_by("title")
        return BookSerializer(qs, many=True).data, None
    return None, "Invalid report type."


def _excel_column_name(index):
    column_name = ""
    while index > 0:
        index, remainder = divmod(index - 1, 26)
        column_name = chr(65 + remainder) + column_name
    return column_name


def _xml_cell(cell_ref, value):
    if value is None:
        value = ""

    if isinstance(value, Decimal):
        value = float(value)

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return f'<c r="{cell_ref}"><v>{value}</v></c>'

    text = escape(str(value))
    return f'<c r="{cell_ref}" t="inlineStr"><is><t>{text}</t></is></c>'


def _xlsx_sheet_xml(headers, rows):
    all_rows = [headers] + rows
    row_xml = []
    for row_index, row_values in enumerate(all_rows, start=1):
        cells = []
        for col_index, value in enumerate(row_values, start=1):
            cell_ref = f"{_excel_column_name(col_index)}{row_index}"
            cells.append(_xml_cell(cell_ref, value))
        row_xml.append(f'<row r="{row_index}">{"".join(cells)}</row>')

    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f'<sheetData>{"".join(row_xml)}</sheetData>'
        "</worksheet>"
    )


def _sanitize_sheet_name(name):
    safe_name = re.sub(r'[\[\]\:\*\?/\\]', "_", str(name or "Report")).strip()
    return safe_name[:31] or "Report"


def _build_xlsx_bytes(sheet_name, headers, rows):
    safe_sheet_name = _sanitize_sheet_name(sheet_name)
    sheet_xml = _xlsx_sheet_xml(headers, rows)

    workbook_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f'<sheets><sheet name="{escape(safe_sheet_name)}" sheetId="1" r:id="rId1"/></sheets>'
        "</workbook>"
    )

    styles_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        '<fonts count="1"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts>'
        '<fills count="2"><fill><patternFill patternType="none"/></fill>'
        '<fill><patternFill patternType="gray125"/></fill></fills>'
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
        '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>'
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
        "</styleSheet>"
    )

    content_types_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/xl/workbook.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        '<Override PartName="/xl/worksheets/sheet1.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        '<Override PartName="/xl/styles.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        "</Types>"
    )

    root_rels_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
        'Target="xl/workbook.xml"/>'
        "</Relationships>"
    )

    workbook_rels_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
        'Target="worksheets/sheet1.xml"/>'
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" '
        'Target="styles.xml"/>'
        "</Relationships>"
    )

    output = BytesIO()
    with ZipFile(output, "w", compression=ZIP_DEFLATED) as zip_file:
        zip_file.writestr("[Content_Types].xml", content_types_xml)
        zip_file.writestr("_rels/.rels", root_rels_xml)
        zip_file.writestr("xl/workbook.xml", workbook_xml)
        zip_file.writestr("xl/_rels/workbook.xml.rels", workbook_rels_xml)
        zip_file.writestr("xl/styles.xml", styles_xml)
        zip_file.writestr("xl/worksheets/sheet1.xml", sheet_xml)

    return output.getvalue()


def _library_export_headers_and_rows(report_type, data):
    if report_type == "availability":
        headers = ["Book Title", "Author", "Category", "Total Copies", "Available Copies", "Rack", "Shelf"]
        rows = [
            [
                item.get("title", ""),
                item.get("author", ""),
                item.get("category", ""),
                item.get("total_copies", 0),
                item.get("available_copies", 0),
                item.get("rack_name", ""),
                item.get("shelf_name", ""),
            ]
            for item in data
        ]
        return headers, rows

    if report_type == "fines":
        headers = [
            "Borrower",
            "Borrower Type",
            "Book",
            "Issue Date",
            "Due Date",
            "Return Date",
            "Fine Amount",
            "Fine Paid",
            "Status",
        ]
        rows = []
        for item in data:
            borrower_name = item.get("student_name") or item.get("staff_name") or ""
            borrower_type = "Student" if item.get("student") else "Staff"
            rows.append(
                [
                    borrower_name,
                    borrower_type,
                    item.get("book_title", ""),
                    item.get("issue_date", ""),
                    item.get("due_date", ""),
                    item.get("return_date", ""),
                    item.get("fine_amount", 0),
                    "Yes" if item.get("fine_paid") else "No",
                    item.get("status", ""),
                ]
            )
        return headers, rows

    if report_type == "overdue":
        headers = ["Borrower", "Borrower Type", "Book", "Issue Date", "Due Date", "Return Date", "Status"]
        rows = []
        for item in data:
            borrower_name = item.get("student_name") or item.get("staff_name") or ""
            borrower_type = "Student" if item.get("student") else "Staff"
            status = "RETURNED LATE" if item.get("status") == "returned" else "OVERDUE"
            rows.append(
                [
                    borrower_name,
                    borrower_type,
                    item.get("book_title", ""),
                    item.get("issue_date", ""),
                    item.get("due_date", ""),
                    item.get("return_date", ""),
                    status,
                ]
            )
        return headers, rows

    headers = ["Borrower", "Borrower Type", "Book", "Issue Date", "Due Date", "Status"]
    rows = []
    for item in data:
        borrower_name = item.get("student_name") or item.get("staff_name") or ""
        borrower_type = "Student" if item.get("student") else "Staff"
        rows.append(
            [
                borrower_name,
                borrower_type,
                item.get("book_title", ""),
                item.get("issue_date", ""),
                item.get("due_date", ""),
                item.get("status", ""),
            ]
        )
    return headers, rows


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def book_list_view(request):
    try:
        if request.method == "GET":
            search = request.query_params.get("search")
            category = request.query_params.get("category")
            qs = Book.objects.select_related("shelf", "shelf__rack").all()
            if search:
                qs = qs.filter(
                    Q(title__icontains=search) | 
                    Q(author__icontains=search) | 
                    Q(isbn__icontains=search) |
                    Q(custom_id__icontains=search)
                )
            if category:
                qs = qs.filter(category__icontains=category)
            return Response(BookSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        data = request.data.copy()
        # Ensure available copies equals total copies on creation
        if "total_copies" in data and "available_copies" not in data:
            data["available_copies"] = data["total_copies"]
            
        serializer = BookSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def book_detail_view(request, pk):
    try:
        try:
            book = Book.objects.get(pk=pk)
        except Book.DoesNotExist:
            return Response({"error": "Book not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(BookSerializer(book).data, status=status.HTTP_200_OK)

        if request.method == "PATCH":
            serializer = BookSerializer(book, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        book.delete()
        return Response({"message": "Book deleted."}, status=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def book_issue_list_view(request):
    try:
        if request.method == "GET":
            student_id = request.query_params.get("student")
            staff_id = request.query_params.get("staff")
            issue_status = request.query_params.get("status")
            qs = BookIssue.objects.select_related(
                "book", "student", "student__user", "staff", "staff__user", "issued_by"
            ).all()
            if student_id:
                qs = qs.filter(student_id=student_id)
            if staff_id:
                qs = qs.filter(staff_id=staff_id)
            if issue_status:
                qs = qs.filter(status=issue_status)
            return Response(BookIssueSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        issue_date = None
        issue_date_raw = request.data.get("issue_date")
        if issue_date_raw:
            issue_date = parse_date(str(issue_date_raw))
            if issue_date is None:
                return Response({"error": "Invalid issue_date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)
            if issue_date > timezone.now().date():
                return Response({"error": "Issue date cannot be in the future."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = BookIssueSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        if issue_date and serializer.validated_data.get("due_date") and serializer.validated_data["due_date"] < issue_date:
            return Response({"error": "Due date cannot be earlier than issue date."}, status=status.HTTP_400_BAD_REQUEST)

        book_id = request.data.get("book")
        try:
            book = Book.objects.get(pk=book_id)
        except Book.DoesNotExist:
            return Response({"error": "Book not found."}, status=status.HTTP_404_NOT_FOUND)

        if book.available_copies < 1:
            return Response({"error": "No copies available."}, status=status.HTTP_400_BAD_REQUEST)

        # Check borrower (at least one must be provided)
        student_id = request.data.get("student")
        staff_id = request.data.get("staff")
        if not student_id and not staff_id:
            return Response({"error": "Either student or staff must be specified."}, status=status.HTTP_400_BAD_REQUEST)

        # Check borrow limits (optional but good for a full system)
        # For now, just save
        issue = serializer.save(issued_by=request.user)
        if issue_date:
            issue.issue_date = issue_date
            issue.save(update_fields=["issue_date"])
        book.available_copies -= 1
        book.save()
        return Response(BookIssueSerializer(issue).data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def book_return_view(request, pk):
    """Mark a book as returned and calculate fine."""
    try:
        try:
            issue = BookIssue.objects.select_related("book").get(pk=pk)
        except BookIssue.DoesNotExist:
            return Response({"error": "Issue record not found."}, status=status.HTTP_404_NOT_FOUND)

        if issue.status == "returned":
            return Response({"error": "Book already returned."}, status=status.HTTP_400_BAD_REQUEST)

        # Get fine rate from settings or default to 2
        fine_rate_setting = LibrarySetting.objects.filter(config_key="fine_rate_per_day").first()
        fine_rate = float(fine_rate_setting.value) if fine_rate_setting else 2.0

        return_date_raw = request.data.get("return_date")
        if return_date_raw:
            return_date = parse_date(str(return_date_raw))
            if return_date is None:
                return Response({"error": "Invalid return_date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return_date = timezone.now().date()

        today = timezone.now().date()
        if return_date > today:
            return Response({"error": "Return date cannot be in the future."}, status=status.HTTP_400_BAD_REQUEST)
        if return_date < issue.issue_date:
            return Response({"error": "Return date cannot be earlier than issue date."}, status=status.HTTP_400_BAD_REQUEST)

        days_late = max(0, (return_date - issue.due_date).days)
        fine = days_late * fine_rate
        return_timing = "delayed" if days_late > 0 else "on_time"

        issue.return_date = return_date
        issue.fine_amount = fine
        issue.status = "returned"
        issue.return_condition = request.data.get("condition", "")
        issue.save()

        issue.book.available_copies += 1
        issue.book.save()

        return Response({
            "message": "Book returned successfully.",
            "days_late": days_late,
            "return_timing": return_timing,
            "fine_amount": float(fine),
            "issue": BookIssueSerializer(issue).data,
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def library_dashboard_view(request):
    """Providing summary statistics for the library dashboard."""
    try:
        total_books = Book.objects.aggregate(total=Sum("total_copies"))["total"] or 0
        available_books = Book.objects.aggregate(total=Sum("available_copies"))["total"] or 0
        issued_books = BookIssue.objects.filter(status="issued").count()
        overdue_books = BookIssue.objects.filter(status="issued", due_date__lt=timezone.now().date()).count()
        total_fines = BookIssue.objects.filter(status="returned").aggregate(total=Sum("fine_amount"))["total"] or 0
        
        # Most borrowed books
        popular_books = Book.objects.annotate(
            issue_count=Count("issues")
        ).order_by("-issue_count")[:5]
        
        return Response({
            "stats": {
                "total_books": total_books,
                "available_books": available_books,
                "issued_books": issued_books,
                "overdue_books": overdue_books,
                "total_fines_collected": float(total_fines),
            },
            "popular_books": BookSerializer(popular_books, many=True).data,
            "recent_issues": BookIssueSerializer(
                BookIssue.objects.select_related("book", "student", "staff").order_by("-issue_date")[:5], 
                many=True
            ).data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def library_reports_view(request):
    """Aggregate data for specific library reports."""
    report_type = request.query_params.get("report_type")
    try:
        data, error = _get_library_report_data(report_type)
        if error:
            return Response({"error": "Invalid report type."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"report_type": report_type, "data": data}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def library_reports_export_view(request):
    """Download report data as an .xlsx file."""
    report_type = request.query_params.get("report_type")
    try:
        data, error = _get_library_report_data(report_type)
        if error:
            return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)

        headers, rows = _library_export_headers_and_rows(report_type, data)
        report_label = report_type.replace("_", " ").title()
        workbook_bytes = _build_xlsx_bytes(report_label, headers, rows)

        date_stamp = timezone.now().date().isoformat()
        filename = f"library_{report_type}_report_{date_stamp}.xlsx"
        response = HttpResponse(
            workbook_bytes,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_fine_paid_view(request, pk):
    """Update payment status of a fine."""
    try:
        issue = BookIssue.objects.get(pk=pk)
        issue.fine_paid = True
        issue.save()
        return Response({"message": "Fine marked as paid."}, status=status.HTTP_200_OK)
    except BookIssue.DoesNotExist:
        return Response({"error": "Record not found."}, status=status.HTTP_404_NOT_FOUND)
