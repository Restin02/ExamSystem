from django.contrib.auth.models import User
from django.http import HttpResponse
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.authtoken.models import Token
from django.db import transaction
from rest_framework.views import APIView
import logging

# Using your specific Keyword-Aligned Models
from .models import StaffManagement, ExamSchedule, ClassroomSetup, DutyAssignment, StaffDutyRequirement
from .serializers import DutyAssignmentSerializer

logger = logging.getLogger(__name__)

# --- 1. STAFF MANAGEMENT ---

@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_insert_staff(request):
    data = request.data
    try:
        with transaction.atomic():
            username = data.get('username')
            if User.objects.filter(username=username).exists():
                return Response({"error": "Username already taken"}, status=400)

            user = User.objects.create_user(
                username=username,
                email=data.get('email'),
                password="passworduser", # Default password
                first_name=data.get('name')
            )
            user.is_staff = True 
            user.save()

            StaffManagement.objects.create(
                user=user,
                name=data.get('name'),
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
@permission_classes([IsAuthenticated])
def get_all_staff(request):
    try:
        staff_members = StaffManagement.objects.select_related('user').all()
        data = []
        for staff in staff_members:
            data.append({
                "id": staff.id,
                "username": staff.user.username if staff.user else "N/A",
                "name": staff.name or (staff.user.first_name if staff.user else "Unnamed"),
                "grade": staff.grade or "",
                "email": staff.user.email if staff.user else "N/A",
                "phone_number": staff.phone_number or "",
                "department": staff.department or "", 
                "branch": staff.branch or "",
                "duties": {
                    "Internal Test 1": staff.internal1_duty_count,
                    "Internal Test 2": staff.internal2_duty_count,
                    "Regular Exam": staff.regular_duty_count
                }          
            })
        return Response(data, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

# --- NEW: UPDATE STAFF DUTY BY EXAM TYPE ---
@api_view(['POST'])
@permission_classes([IsAdminUser])
def update_staff_duty_counts(request):
    """
    Updates the requirement rules AND synchronizes the individual 
    staff member columns based on their grade.
    """
    duties = request.data.get('duties', [])
    
    if not duties:
        return Response({"error": "No duty data provided"}, status=400)

    try:
        with transaction.atomic():
            for item in duties:
                grade = item.get('grade')
                exam_type = item.get('examType')
                count = int(item.get('count', 0))

                if not grade or not exam_type:
                    continue

                # 1. Update the 'Rulebook' (StaffDutyRequirement)
                StaffDutyRequirement.objects.update_or_create(
                    staff_grade=grade,
                    exam_type=exam_type,
                    defaults={'required_count': count}
                )

                # 2. Update the 'Staff Management' specific columns
                # We filter by grade and update the column corresponding to the exam type
                staff_subset = StaffManagement.objects.filter(grade=grade)

                if "Internal Test 1" in exam_type:
                    staff_subset.update(internal1_duty_count=count)
                elif "Internal Test 2" in exam_type:
                    staff_subset.update(internal2_duty_count=count)
                elif "Regular" in exam_type:
                    staff_subset.update(regular_duty_count=count)
                elif "Supplementary" in exam_type or "Supply" in exam_type:
                    staff_subset.update(supply_duty_count=count)

        return Response({"message": "Requirements and Staff counts updated successfully!"}, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=400)

# --- 2. STAFF TIMETABLE ---

@api_view(['POST'])
@permission_classes([IsAdminUser])
def save_timetable(request):
    try:
        username = request.data.get('staff_username')
        schedule = request.data.get('schedule') 
        user = User.objects.get(username=username)
        profile = getattr(user, 'staffmanagement', None)
        if not profile:
            return Response({"error": "Staff profile not found"}, status=404)
        
        profile.timetable_data = schedule
        profile.save()
        return Response({"message": "Timetable saved successfully!"})
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_staff_timetable(request, username):
    try:
        user = User.objects.get(username=username)
        profile = getattr(user, 'staffmanagement', None)
        return Response({
            "username": user.username,
            "email": user.email,
            "schedule": profile.timetable_data if profile else []
        })
    except User.DoesNotExist:
        return Response({"error": "Staff not found"}, status=404)

# --- 3. CLASSROOM & EXAM ---

@api_view(['POST'])
@permission_classes([IsAdminUser])
def insert_classroom(request):
    try:
        data = request.data
        if not all([data.get('block'), data.get('room_no'), data.get('capacity')]):
            return Response({"error": "Missing required fields"}, status=400)

        ClassroomSetup.objects.create(
            block=data.get('block'),
            room_no=data.get('room_no'),
            capacity=data.get('capacity'),
            date=data.get('date')
        )
        return Response({"message": "Saved to Classroom Setup!"}, status=201)
    except Exception as e:
        return Response({"error": f"Database Error: {str(e)}"}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_rooms(request):
    rooms = ClassroomSetup.objects.all().order_by('-id')
    data = [{
        "id": r.id, 
        "block": r.block, 
        "room_no": r.room_no, 
        "capacity": r.capacity,
        "date": r.date.strftime('%Y-%m-%d') if r.date else None 
    } for r in rooms]
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def insert_exam_schedule(request):
    data = request.data
    try:
        with transaction.atomic():
            date = data.get('date')
            session = data.get('session')
            exam_type = data.get('examType', 'Regular Exam') # Matches React default
            schedules = data.get('schedules', [])

            # 1. Save individual exam subject entries
            for item in schedules:
                ExamSchedule.objects.create(
                    course_name=f"{item.get('dept')} {item.get('branch')} ({item.get('sem')})",
                    subject=item.get('subject'),
                    date=date,
                    session=session,
                    exam_type=exam_type,
                    time_slot=f"{session} - {exam_type}"
                )
            
            # 2. Logic to automatically pull duty requirements based on exam type could go here
            # Or continue saving specific overrides if passed in the request

        return Response({"message": "Saved to Exam Schedule successfully!"}, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_exams(request):
    exams = ExamSchedule.objects.all().order_by('-date')
    data = []
    for e in exams:
        # Handling date formatting for JSON
        formatted_date = e.date.strftime('%Y-%m-%d') if hasattr(e.date, 'strftime') else str(e.date)
        
        data.append({
            "id": e.id,
            "course_name": e.course_name,
            "subject": e.subject,
            "date": formatted_date,
            "session": getattr(e, 'session', ''),
            "exam_type": getattr(e, 'exam_type', ''),
            "time_slot": e.time_slot,
        })
    return Response(data)

# --- 4. DASHBOARD & ALLOCATION ---

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def staff_dashboard(request):
    try:
        profile = getattr(request.user, 'staffmanagement', None)
        image_url = None
        if profile and profile.profile_image:
            image_url = request.build_absolute_uri(profile.profile_image.url)

        return Response({
            "profile": {
                "name": request.user.first_name or request.user.username,
                "email": request.user.email,
                "grade": profile.grade if profile else "Not Assigned",
                "department": profile.department if profile else "N/A",
                "branch": profile.branch if profile else "N/A",
                "image_url": image_url,
                "requirements": {
            "Internal 1 Duty": profile.internal1_duty_count,
            "Internal 2 Duty": profile.internal2_duty_count,
            "Regular Duty": profile.regular_duty_count,
        }
            },
            "timetable": profile.timetable_data if profile else []
        })
    except Exception as e:
        return Response({"error": str(e)}, status=400)

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
            return Response({
                "message": "Image uploaded", 
                "url": request.build_absolute_uri(profile.profile_image.url)
            })
        return Response({"error": "No image file found"}, status=400)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def allocate_duties(request):
    """
    Enhanced Allocation logic that respects individual limits for 
    Internal 1, Internal 2, Regular, and Supplementary exams.
    """
    try:
        with transaction.atomic():
            # 1. Clear previous assignments and reset counts for a fresh allocation
            DutyAssignment.objects.all().delete()
            StaffManagement.objects.all().update(
                duty_count=0,
                internal1_duty_count=0,
                internal2_duty_count=0,
                regular_duty_count=0,
                supply_duty_count=0
            )
            
            sessions = ExamSchedule.objects.all()
            rooms = ClassroomSetup.objects.all()

            for session in sessions:
                # Identify exam type (e.g., 'Internal Test 1', 'Regular Exam')
                current_type = getattr(session, 'exam_type', 'Regular Exam')
                
                for room in rooms:
                    # 2. Get all staff members
                    all_staff = StaffManagement.objects.all()
                    eligible_staff = []

                    for staff in all_staff:
                        # 3. Look up the requirement/limit for this staff's grade and this exam type
                        req = StaffDutyRequirement.objects.filter(
                            staff_grade=staff.grade, 
                            exam_type=current_type
                        ).first()
                        
                        # Default limit is 0 if no rule is found, or use the saved count
                        limit = req.required_count if req else 0

                        # 4. Check if staff has reached their specific limit for this type
                        current_staff_count = 0
                        if "Internal Test 1" in current_type:
                            current_staff_count = staff.internal1_duty_count
                        elif "Internal Test 2" in current_type:
                            current_staff_count = staff.internal2_duty_count
                        elif "Regular" in current_type:
                            current_staff_count = staff.regular_duty_count
                        elif "Supplementary" in current_type or "Supply" in current_type:
                            current_staff_count = staff.supply_duty_count

                        if current_staff_count < limit:
                            eligible_staff.append(staff)

                    # 5. Pick the eligible staff with the lowest TOTAL duty_count to keep it fair
                    if eligible_staff:
                        # Sort by total duty_count and pick the first one
                        eligible_staff.sort(key=lambda x: x.duty_count)
                        selected_staff = eligible_staff[0]

                        # 6. Create Assignment
                        DutyAssignment.objects.create(
                            staff=selected_staff, 
                            exam=session, 
                            room=room
                        )

                        # 7. Increment specific and total counts
                        if "Internal Test 1" in current_type:
                            selected_staff.internal1_duty_count += 1
                        elif "Internal Test 2" in current_type:
                            selected_staff.internal2_duty_count += 1
                        elif "Regular" in current_type:
                            selected_staff.regular_duty_count += 1
                        elif "Supplementary" in current_type or "Supply" in current_type:
                            selected_staff.supply_duty_count += 1
                        
                        selected_staff.duty_count += 1
                        selected_staff.save()

            return Response({"message": "Duty Allocation Complete!"}, status=200)
            
    except Exception as e:
        return Response({"error": str(e)}, status=500)

# --- 5. AUTHENTICATION & PROFILE SETTINGS ---

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
        if serializer.is_valid():
            user = serializer.validated_data['user']
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'username': user.username,
                'is_superuser': user.is_superuser,
                'is_staff': user.is_staff
            })
        return Response(serializer.errors, status=400)

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        user = request.user
        profile = getattr(user, 'staffmanagement', None)
        return Response({
            "username": user.username,
            "email": user.email,
            "name": user.first_name,
            "phone_number": getattr(profile, 'phone_number', ''),
            "grade": getattr(profile, 'grade', ''),
            "department": getattr(profile, 'department', ''),
            "branch": getattr(profile, 'branch', ''),
        })

class UpdateProfileView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        user = request.user
        data = request.data
        profile = getattr(user, 'staffmanagement', None)

        if not profile:
            return Response({"message": "Staff profile not found"}, status=404)

        try:
            with transaction.atomic():
                if 'name' in data:
                    user.first_name = data['name']
                    profile.name = data['name']
                if 'password' in data and data['password'].strip():
                    user.set_password(data['password'])
                user.save()

                if 'phone_number' in data: profile.phone_number = data['phone_number']
                if 'grade' in data: profile.grade = data['grade']
                profile.save()

            return Response({"message": "Profile updated successfully"}, status=200)
        except Exception as e:
            return Response({"message": str(e)}, status=400)

# --- 6. DELETION & HOME ---

@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def delete_staff(request, username):
    try:
        User.objects.get(username=username).delete()
        return Response({"message": "Staff deleted successfully"}, status=200)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def delete_room(request, id):
    try:
        ClassroomSetup.objects.get(id=id).delete()
        return Response({"message": "Room deleted successfully"}, status=200)
    except ClassroomSetup.DoesNotExist:
        return Response({"error": "Room not found"}, status=404)

@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def delete_exam_schedule(request, pk):
    try:
        ExamSchedule.objects.get(pk=pk).delete()
        return Response({"message": "Deleted successfully"}, status=204)
    except ExamSchedule.DoesNotExist:
        return Response({"error": "Exam not found"}, status=404)

@api_view(['GET'])
def get_duties(request):
    duties = DutyAssignment.objects.all()
    serializer = DutyAssignmentSerializer(duties, many=True)
    return Response(serializer.data)

def home_view(request):
    return HttpResponse("<h1>Exam System API is Running</h1>")