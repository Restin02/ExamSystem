import random
from django.core.mail import send_mail
from django.conf import settings
from rest_framework.response import Response
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from django.http import HttpResponse
from .models import StaffProfile, ExamSession, Classroom, DutyAssignment
from .serializers import DutyAssignmentSerializer

# Storage for OTP and Temporary User Data
otp_storage = {} 
signup_data_storage = {} 

# --- 1. AUTHENTICATION (OTP BASED SIGNUP) ---

@api_view(['POST'])
def send_otp(request):
    email = request.data.get('email')
    if not email:
        return Response({"error": "Email is required"}, status=400)
    
    # Store all signup data (username, password, etc.) until OTP is verified
    signup_data_storage[email] = request.data
    
    otp = str(random.randint(100000, 999999))
    otp_storage[email] = otp
    
    print(f"\n--- DEBUG OTP FOR {email}: {otp} ---\n")
    
    send_mail(
        'Staff Portal OTP',
        f'Your verification code is: {otp}',
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=True,
    )
    return Response({"message": "OTP Sent"})

@api_view(['POST'])
def verify_otp(request):
    email = request.data.get('email')
    otp_received = request.data.get('otp')
    
    # Check if the code matches what we sent
    if email in otp_storage and otp_storage[email] == otp_received:
        user_info = signup_data_storage.get(email)
        
        if not user_info:
            return Response({"error": "Signup session expired. Please click Register again."}, status=400)

        try:
            # THIS IS THE MOMENT THE USER GOES INTO THE DATABASE
            user = User.objects.create_user(
                username=user_info.get('username'),
                email=email,
                password=user_info.get('password'),
                first_name=user_info.get('name', '')
            )
            
            # This creates the Profile linked to that User
            StaffProfile.objects.create(
                user=user,
                phone_number=user_info.get('phone'),
                department="General"
            )

            # Give them a token so they can go to the Dashboard
            token, _ = Token.objects.get_or_create(user=user)
            
            # Clean up the "waiting room"
            del otp_storage[email]
            del signup_data_storage[email]
            
            return Response({"token": token.key, "message": "User created successfully!"}, status=201)

        except Exception as e:
            # If there is a REAL database error, this will tell us what it is
            return Response({"error": str(e)}, status=400)
    
    return Response({"error": "Invalid OTP code."}, status=400)

# --- 2. STAFF PROFILE ---

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def manage_profile(request):
    try:
        # This ensures a profile exists before we try to use it
        profile, created = StaffProfile.objects.get_or_create(user=request.user)

        if request.method == 'POST':
            timetable_data = request.data.get('timetable')
            profile.timetable = timetable_data
            profile.save()
            return Response({"message": "Saved!"})

        return Response({
            "username": request.user.username,
            "timetable": profile.timetable
        })
    except Exception as e:
        # This will print the EXACT error in your Django terminal
        print(f"Error in manage_profile: {e}") 
        return Response({"error": str(e)}, status=500)

# --- 3. DUTY ALLOCATION ---

@api_view(['POST'])
def allocate_duties(request):
    sessions = ExamSession.objects.all()
    rooms = Classroom.objects.all()
    DutyAssignment.objects.all().delete()
    StaffProfile.objects.all().update(duty_count=0)

    for session in sessions:
        for room in rooms:
            staff = StaffProfile.objects.order_by('duty_count').first()
            if staff:
                DutyAssignment.objects.create(staff=staff, session=session, room=room)
                staff.duty_count += 1
                staff.save()
    return Response({"message": "Allocation Complete"})

@api_view(['GET'])
def get_duties(request):
    duties = DutyAssignment.objects.all()
    serializer = DutyAssignmentSerializer(duties, many=True)
    return Response(serializer.data)

def home_view(request):
    return HttpResponse("<h1>Staff Portal API is Running</h1><p>The backend is connected.</p>")

class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        
        # This is where we check if the profile exists
        return Response({
            'token': token.key,
            'username': user.username,
            'email': user.email
        })