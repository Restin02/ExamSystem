from django.urls import path
from . import views
from .views import (
    AdminTokenView, 
    CustomAuthToken, 
    ProfileView, 
    UpdateProfileView
)

urlpatterns = [
    # --- 1. Authentication ---
    path('auth/token/', AdminTokenView.as_view(), name='api_token_auth'),
    path('login/', CustomAuthToken.as_view(), name='api_login'),
    
    # --- 2. Admin Actions ---
    path('admin/insert-staff/', views.admin_insert_staff, name='insert_staff'),
    path('admin/get-all-staff/', views.get_all_staff, name='get_all_staff'),
    path('admin/delete-staff/<str:username>/', views.delete_staff, name='delete_staff'),
    
    # Room Management
    path('admin/get-rooms/', views.get_rooms, name='get_rooms'),
    path('admin/insert-room/', views.insert_classroom, name='insert_classroom'),
    path('admin/delete-room/<int:id>/', views.delete_room, name='delete_room'),
    
    # Timetable & Exams
    path('admin/save-timetable/', views.save_timetable, name='save_timetable'),
    path('admin/get-staff-timetable/<str:username>/', views.get_staff_timetable, name='get_staff_timetable'),
    path('admin/get-exams/', views.get_all_exams, name='get_all_exams'),
    path('admin/insert-exam/', views.insert_exam_schedule, name='insert_exam'),
    path('admin/delete-exam-schedule/<int:pk>/', views.delete_exam_schedule, name='delete_exam'),
    
    # MOVED AND UPDATED THIS LINE:
    path('admin/update-staff-duty-counts/', views.update_staff_duty_counts, name='update_staff_duty_counts'),

    # --- 3. Staff / User Actions ---
    path('profile/', ProfileView.as_view(), name='get_profile'),
    path('update-profile/', UpdateProfileView.as_view(), name='update_profile'),
    
    # Dashboard & Profile Features
    path('staff/my-dashboard/', views.staff_dashboard, name='staff_dashboard'),
    path('staff/upload-image/', views.upload_profile_image, name='upload_profile_image'),
    
    # --- 4. Logic & Allocation ---
    path('allocate/', views.allocate_duties, name='allocate_duties'),
    path('duties/', views.get_duties, name='get_duties'),
]