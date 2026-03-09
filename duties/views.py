from django.contrib.auth.models import User
from django.http import HttpResponse
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.authtoken.models import Token
from django.db import transaction

# Using your specific Keyword-Aligned Models
from .models import StaffManagement, ExamSchedule, ClassroomSetup, DutyAssignment
from .serializers import DutyAssignmentSerializer

# --- 1. STAFF MANAGEMENT ---

@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_insert_staff(request):
    data = request.data
    try:
        with transaction.atomic():
            if User.objects.filter(username=data.get('username')).exists():
                return Response({"error": "Username already taken"}, status=400)

            user = User.objects.create_user(
                username=data.get('username'),
                email=data.get('email'),
                password="passworduser",
                first_name=data.get('name')
            )
            user.is_staff = True 
            user.save()

            StaffManagement.objects.create(
                user=user,
                staff_id=f"STF-{data.get('username').upper()}",
                department=data.get('department'),
                branch=data.get('branch'),
                phone_number=data.get('phone_number'),
                grade=data.get('grade')
            )
        return Response({"message": "Success"}, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['GET'])
@permission_classes([AllowAny]) 
def get_all_staff(request):
    try:
        staff_list = StaffManagement.objects.all().select_related('user')
        data = []
        for s in staff_list:
            data.append({
                "id": s.user.id,
                "username": s.user.username,
                "name": s.user.first_name,
                "email": s.user.email,
                "staff_id": s.staff_id,
                "grade": s.grade,
                "department": s.department,
                "branch": s.branch,
                "phone_number": s.phone_number,
                "timetable": s.timetable_data
            })
        return Response(data)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

# --- 2. STAFF TIMETABLE ---

@api_view(['POST'])
@permission_classes([IsAdminUser])
def save_timetable(request):
    try:
        username = request.data.get('staff_username')
        schedule = request.data.get('schedule') 
        user = User.objects.get(username=username)
        profile = user.staffmanagement
        profile.timetable_data = schedule
        profile.save()
        return Response({"message": "Timetable saved successfully!"})
    except User.DoesNotExist:
        return Response({"error": "Staff not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_staff_timetable(request, username):
    try:
        user = User.objects.get(username=username)
        profile = user.staffmanagement
        return Response({
            "username": user.username,
            "email": user.email,
            "schedule": profile.timetable_data or []
        })
    except User.DoesNotExist:
        return Response({"error": "Staff not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

# --- 3. CLASSROOM & EXAM ---

@api_view(['POST'])
@permission_classes([IsAdminUser])
def insert_classroom(request):
    try:
        block = request.data.get('block')
        room_no = request.data.get('room_no')
        capacity = request.data.get('capacity')
        date = request.data.get('date') 

        if not all([block, room_no, capacity]):
            return Response({"error": "Missing required fields"}, status=400)

        ClassroomSetup.objects.create(
            block=block,
            room_no=room_no,
            capacity=capacity,
            date=date  
        )
        return Response({"message": "Saved to Classroom Setup!"}, status=201)
    except Exception as e:
        return Response({"error": f"Database Error: {str(e)}"}, status=400)
        
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_rooms(request):
    rooms = ClassroomSetup.objects.all().order_by('-id')
    data = [
        {
            "id": r.id, 
            "block": r.block, 
            "room_no": r.room_no, 
            "capacity": r.capacity,
            "date": r.date.strftime('%Y-%m-%d') if r.date else None 
        } for r in rooms
    ]
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def insert_exam_schedule(request):
    data = request.data
    try:
        date = data.get('date')
        session = data.get('session')
        exam_type = data.get('examType', 'Regular')
        schedules = data.get('schedules', [])
        
        for item in schedules:
            ExamSchedule.objects.create(
                course_name=f"{item.get('dept')} {item.get('branch')} ({item.get('sem')})",
                subject=item.get('subject'),
                date=date,
                time_slot=f"{session} - {exam_type}"
            )
        return Response({"message": "Saved to Exam Schedule!"}, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_exams(request):
    try:
        exams = ExamSchedule.objects.all().order_by('-date')
        data = [{
            "id": e.id,
            "course_name": e.course_name,
            "subject": e.subject,
            "date": e.date,
            "time_slot": e.time_slot,
        } for e in exams]
        return Response(data)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

# --- 4. DASHBOARD & ALLOCATION ---

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def staff_dashboard(request):
    try:
        profile = StaffManagement.objects.filter(user=request.user).first()
        if not profile:
            return Response({
                "profile": {
                    "name": f"{request.user.first_name} {request.user.last_name}" or request.user.username,
                    "email": request.user.email,
                    "grade": "Not Assigned",
                    "department": "N/A",
                    "branch": "N/A",
                    "image_url": None
                },
                "timetable": []
            })

        image_url = None
        try:
            if profile.profile_image and hasattr(profile.profile_image, 'url'):
                image_url = request.build_absolute_uri(profile.profile_image.url)
        except:
            image_url = None

        return Response({
            "profile": {
                "name": f"{request.user.first_name} {request.user.last_name}" or request.user.username,
                "email": request.user.email,
                "grade": profile.grade,
                "department": profile.department,
                "branch": profile.branch,
                "image_url": image_url
            },
            "timetable": profile.timetable_data or []
        })
    except Exception as e:
        return Response({"error": "Internal Server Error", "details": str(e)}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_profile_image(request):
    try:
        profile = getattr(request.user, 'staffmanagement', None)
        if not profile:
            return Response({"error": "Staff profile not found"}, status=404)

        if 'image' in request.FILES:
            profile.profile_image = request.FILES['image']
            profile.save()
            image_url = request.build_absolute_uri(profile.profile_image.url)
            return Response({"message": "Image uploaded", "url": image_url})
        return Response({"error": "No image file found in request"}, status=400)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def allocate_duties(request):
    DutyAssignment.objects.all().delete()
    StaffManagement.objects.all().update(duty_count=0)
    
    sessions = ExamSchedule.objects.all()
    rooms = ClassroomSetup.objects.all()

    for session in sessions:
        for room in rooms:
            staff = StaffManagement.objects.order_by('duty_count').first()
            if staff:
                DutyAssignment.objects.create(staff=staff, session=session, room=room)
                staff.duty_count += 1
                staff.save()
    return Response({"message": "Duty Allocation Complete!"})

# --- AUTHENTICATION & DELETION ---

class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'username': user.username,
            'is_superuser': user.is_superuser,
            'is_staff': user.is_staff
        })

class AdminTokenView(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        if not user.is_superuser:
            return Response({"error": "Admin access denied."}, status=403)
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'is_superuser': True,
            'username': user.username
        })

@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def delete_staff(request, username):
    try:
        user = User.objects.get(username=username)
        user.delete()
        return Response({"message": "Staff deleted successfully"}, status=200)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def delete_room(request, id):
    try:
        room = ClassroomSetup.objects.get(id=id)
        room.delete()
        return Response({"message": "Room deleted successfully"}, status=200)
    except ClassroomSetup.DoesNotExist:
        return Response({"error": "Room not found"}, status=404)

@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def delete_exam_schedule(request, pk):
    try:
        exam = ExamSchedule.objects.get(pk=pk)
        exam.delete()
        return Response({"message": "Deleted successfully"}, status=status.HTTP_204_NO_CONTENT)
    except ExamSchedule.DoesNotExist:
        return Response({"error": "Exam not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
def get_duties(request):
    duties = DutyAssignment.objects.all()
    serializer = DutyAssignmentSerializer(duties, many=True)
    return Response(serializer.data)

def home_view(request):
    return HttpResponse("<h1>Exam System API is Running</h1>")