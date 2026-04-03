from django.urls import path
from . import views

urlpatterns = [
    path("", views.election_list_view, name="election-list"),
    path("<int:pk>/end/", views.election_end_view, name="election-end"),
    path("vote-status/", views.vote_status_view, name="election-vote-status"),
    path("vote/", views.vote_view, name="election-vote"),
    path("<int:pk>/results/", views.results_view, name="election-results"),
]

