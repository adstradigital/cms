from django.urls import path
from . import views

urlpatterns = [
    path("books/", views.book_list_view, name="book-list"),
    path("books/<int:pk>/", views.book_detail_view, name="book-detail"),
    path("issues/", views.book_issue_list_view, name="book-issue-list"),
    path("issues/<int:pk>/return/", views.book_return_view, name="book-return"),
]
