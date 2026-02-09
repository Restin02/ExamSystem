from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token
from . import views
from .views import manage_profile

urlpatterns = [
    path('api/login/', obtain_auth_token, name='api_login'),
    path('api/send-otp/', views.send_otp, name='send_otp'),
    path('api/verify-otp/', views.verify_otp, name='verify_otp'),
    path('api/profile/', views.manage_profile, name='manage_profile'),
    path('api/allocate/', views.allocate_duties, name='allocate_duties'),
    path('api/duties/', views.get_duties, name='get_duties'),
    path('api/signup/', views.send_otp, name='signup'),
]