from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Book, BookIssue
from .serializers import BookSerializer, BookIssueSerializer


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def book_list_view(request):
    try:
        if request.method == "GET":
            search = request.query_params.get("search")
            category = request.query_params.get("category")
            qs = Book.objects.all()
            if search:
                qs = qs.filter(title__icontains=search) | qs.filter(author__icontains=search)
            if category:
                qs = qs.filter(category__icontains=category)
            return Response(BookSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = BookSerializer(data=request.data)
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
            issue_status = request.query_params.get("status")
            qs = BookIssue.objects.select_related("book", "student", "student__user", "issued_by").all()
            if student_id:
                qs = qs.filter(student_id=student_id)
            if issue_status:
                qs = qs.filter(status=issue_status)
            return Response(BookIssueSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = BookIssueSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        book_id = request.data.get("book")
        try:
            book = Book.objects.get(pk=book_id)
        except Book.DoesNotExist:
            return Response({"error": "Book not found."}, status=status.HTTP_404_NOT_FOUND)

        if book.available_copies < 1:
            return Response({"error": "No copies available."}, status=status.HTTP_400_BAD_REQUEST)

        issue = serializer.save(issued_by=request.user)
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

        return_date = timezone.now().date()
        days_late = max(0, (return_date - issue.due_date).days)
        fine = days_late * 2

        issue.return_date = return_date
        issue.fine_amount = fine
        issue.status = "returned"
        issue.save()

        issue.book.available_copies += 1
        issue.book.save()

        return Response({
            "message": "Book returned successfully.",
            "days_late": days_late,
            "fine_amount": fine,
            "issue": BookIssueSerializer(issue).data,
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
