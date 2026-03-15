import os
import logging
from django.contrib.auth.models import User
from django.http import HttpResponse
from django.db import transaction
from django.conf import settings

from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView

# Import all models including Department and Branch
from .models import (
    StaffManagement, StaffAvailability, ExamSchedule, ClassroomSetup, 
    DutyAssignment, StaffDutyRequirement, Department, Branch
)
from .serializers import DutyAssignmentSerializer

logger = logging.getLogger(__name__)

# --- 1. DEPARTMENT & BRANCH STRUCTURE ---

@api_view(['GET', 'POST']) # Change this line to allow both
@permission_classes([IsAdminUser])
def save_structure(request):
    # 1. Handle Loading (GET)
    if request.method == 'GET':
        try:
            structure = []
            # Fetch all departments and their related branches
            departments = Department.objects.all().prefetch_related('branches')
            
            for dept in departments:
                branches = [
                    {'name': b.name, 'semCount': b.sem_count} 
                    for b in dept.branches.all()
                ]
                structure.append({'name': dept.name, 'branches': branches})
            
            return Response({"structure": structure}, status=200)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    # 2. Handle Saving (POST)
    if request.method == 'POST':
        structure_data = request.data.get('structure', [])
        try:
            with transaction.atomic():
                # Get list of department names from the request
                incoming_dept_names = [dept_data['name'] for dept_data in structure_data]
                
                # Delete departments not in the incoming list
                Department.objects.exclude(name__in=incoming_dept_names).delete()
                
                for dept_data in structure_data:
                    # Get or create the department
                    dept, _ = Department.objects.get_or_create(name=dept_data['name'])
                    
                    # Get list of branch names for this specific department
                    incoming_branch_names = [b['name'] for b in dept_data.get('branches', [])]
                    
                    # Delete branches for this department not in the incoming list
                    Branch.objects.filter(department=dept).exclude(name__in=incoming_branch_names).delete()
                    
                    for branch_data in dept_data.get('branches', []):
                        # Update or create the branch
                        Branch.objects.update_or_create(
                            department=dept,
                            name=branch_data['name'],
                            defaults={'sem_count': int(branch_data.get('semCount', 8))}
                        )
            return Response({"message": "Structure synced successfully"}, status=200)
        except Exception as e:
            return Response({"error": str(e)}, status=400)

# --- 2. STAFF MANAGEMENT ---

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
@permission_classes([IsAdminUser])
def get_all_staff(request):
    try:
        staff_members = StaffManagement.objects.all()
        data = []
        for s in staff_members:
            data.append({
                "id": s.id,
                "username": s.user.username,
                "name": s.name or s.user.get_full_name() or s.user.username,
                "email": s.user.email,
                "grade": s.grade,
                "department": s.department,
                "branch": s.branch,
                "phone_number": s.phone_number,
                "internal1_duty_count": s.internal1_duty_count,
                "internal2_duty_count": s.internal2_duty_count,
                "regular_duty_count": s.regular_duty_count,
                "supply_duty_count": s.supply_duty_count,
            })
        return Response(data)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def update_staff_duty_counts(request):
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

                StaffDutyRequirement.objects.update_or_create(
                    staff_grade=grade,
                    exam_type=exam_type,
                    defaults={'required_count': count}
                )

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

# --- 3. STAFF TIMETABLE ---

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

# --- 4. CLASSROOM & EXAM ---

@api_view(['POST'])
@permission_classes([IsAdminUser])
def insert_classroom(request):
    try:
        data = request.data
        # 1. Added 'session' to the validation check
        required_fields = ['block', 'room_no', 'capacity', 'session', 'date']
        if not all(data.get(field) for field in required_fields):
            return Response({"error": "Missing required fields (block, room_no, capacity, session, date)"}, status=400)

        # 2. Saving to the model including session and date
        ClassroomSetup.objects.create(
            block=data.get('block'),
            room_no=data.get('room_no'),
            capacity=data.get('capacity'),
            exam_type=data.get('exam_type'),
            session=data.get('session'), # Added this
            date=data.get('date')
        )
        return Response({"message": "Saved to Classroom Setup!"}, status=201)
    except Exception as e:
        return Response({"error": f"Database Error: {str(e)}"}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_rooms(request):
    # 3. Improved ordering: order by date descending, then by session
    rooms = ClassroomSetup.objects.all().order_by('-date', 'session', 'block')
    
    data = [{
        "id": r.id, 
        "block": r.block, 
        "room_no": r.room_no, 
        "capacity": r.capacity,
        "session": r.session, # Added this to the response
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
            session = data.get('session', 'FN')
            exam_type = data.get('examType', 'Regular Exam') 
            # Default time slot if not provided by frontend
            time_slot = data.get('time_slot', '9:30 AM - 12:30 PM' if session == 'FN' else '1:30 PM - 4:30 PM')
            
            schedules = data.get('schedules', [])

            if not schedules:
                return Response({"error": "No schedule data provided"}, status=400)

            for item in schedules:
                # CRITICAL: Added time_slot which is mandatory in your model
                ExamSchedule.objects.create(
                    course_name=f"{item.get('branch')}({item.get('sem')})",
                    subject=item.get('subject'),
                    date=date,
                    time_slot=time_slot, 
                    session=session,
                    exam_type=exam_type
                )
                
        return Response({
            "message": "Saved successfully! Staff availability has been auto-calculated."
        }, status=201)

    except Exception as e:
        # This will catch missing fields or errors in the background Signal
        print(f"Error saving schedule: {str(e)}") 
        return Response({"error": f"Database Error: {str(e)}"}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_exams(request):
    exams = ExamSchedule.objects.all().order_by('-date')
    data = []
    for e in exams:
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

@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_allocated_duties(request):
    # Get dates from the React request (?start=YYYY-MM-DD&end=YYYY-MM-DD)
    start_date = request.query_params.get('start')
    end_date = request.query_params.get('end')

    if not start_date or not end_date:
        return Response({"error": "Please provide both start and end dates"}, status=400)

    try:
        # 1. Fetch records within the range that were marked available
        availabilities = StaffAvailability.objects.filter(
            exam_date__range=[start_date, end_date],
            is_available=True
        ).select_related('staff')

        results = []
        for record in availabilities:
            # 2. Link to StaffManagement to get profile details
            try:
                profile = StaffManagement.objects.get(user=record.staff)
                display_name = profile.name or record.staff.username
                branch_name = profile.branch or "—"
                dept_name = profile.department or "—"
                grade_val = profile.grade or "—"
            except StaffManagement.DoesNotExist:
                # Fallback if profile is missing
                display_name = record.staff.username
                branch_name = "—"
                dept_name = "—"
                grade_val = "—"

            results.append({
                "name": display_name,
                "date": record.exam_date.strftime('%Y-%m-%d') if hasattr(record.exam_date, 'strftime') else record.exam_date,
                "session": record.session,
                "branch": branch_name,
                "department": dept_name,  # Added this field
                "grade": grade_val        # Added this field
            })

        return Response({"allocated_staff": results}, status=200)

    except Exception as e:
        return Response({"error": f"Internal Error: {str(e)}"}, status=500)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def get_available_staff_for_duty(request):
    try:
        # Data from Admin: { "date": "2026-03-16", "branch_sem": "IMCAS2", "session": "FN" }
        exam_date = request.data.get('date')
        target_branch_sem = request.data.get('branch_sem') # e.g., "IMCAS2"
        session = request.data.get('session') # "FN" or "AN"
        
        if not all([exam_date, target_branch_sem, session]):
            return Response({"error": "Missing required fields"}, status=400)

        # Get day name (e.g., "Monday")
        day_name = pd.to_datetime(exam_date).day_name()
        
        available_staff_list = []
        
        # 1. Get all staff profiles
        all_staff = StaffProfile.objects.all().select_related('user')
        
        # 2. Define the blocks of periods we need free
        target_periods = ['P1', 'P2', 'P3'] if session == "FN" else ['P4', 'P5', 'P6']
        
        for profile in all_staff:
            # 3. GET ORIGINAL SLOTS
            slots = Timetable.objects.filter(staff=profile.user, day=day_name)
            
            # 4. VIRTUAL CLEANUP: Ignore the exam branch/sem
            # This is your logic: "If they teach IMCAS2 during the exam, they are actually free"
            virtual_timetable = slots.exclude(branch_sem=target_branch_sem)
            
            # 5. FN/AN CHECKING
            # We check if there are ANY remaining classes in the target periods
            is_fully_free = True
            for p in target_periods:
                if virtual_timetable.filter(period=p).exists():
                    is_fully_free = False
                    break
            
            # 6. ADD TO LIST IF FREE
            if is_fully_free:
                available_staff_list.append({
                    "id": profile.user.id,
                    "name": profile.user.get_full_name() or profile.user.username,
                    "branch": profile.branch
                })

        return Response({
            "exam_details": {
                "date": exam_date,
                "day": day_name,
                "session": session,
                "target": target_branch_sem
            },
            "available_staff": available_staff_list
        }, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=400)

# --- 5. DASHBOARD & ALLOCATION ---

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
                "name": profile.name if profile and profile.name else (request.user.first_name or request.user.username),
                "email": request.user.email,
                "phone": profile.phone_number if profile else "N/A",
                "grade": profile.grade if profile else "Not Assigned",
                "department": profile.department if profile else "N/A",
                "branch": profile.branch if profile else "N/A",
                "image_url": image_url,
                "internal1_duty_count": profile.internal1_duty_count if profile else 0, 
                "internal2_duty_count": profile.internal2_duty_count if profile else 0, 
                "regular_duty_count": profile.regular_duty_count if profile else 0,     
                "supply_duty_count": profile.supply_duty_count if profile else 0,
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
            new_image = request.FILES['image']
            if profile.profile_image and os.path.isfile(profile.profile_image.path):
                try:
                    os.remove(profile.profile_image.path)
                except:
                    pass
            profile.profile_image = new_image
            profile.save()
            image_url = request.build_absolute_uri(profile.profile_image.url)
            return Response({"message": "Image uploaded successfully", "image_url": image_url})
        return Response({"error": "No image file found in request"}, status=400)
    except Exception as e:
        return Response({"error": f"Upload failed: {str(e)}"}, status=500)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def allocate_duties(request):
    try:
        with transaction.atomic():
            DutyAssignment.objects.all().delete()
            StaffManagement.objects.all().update(duty_count=0)
            sessions = ExamSchedule.objects.all()
            rooms = ClassroomSetup.objects.all()

            for session in sessions:
                current_type = getattr(session, 'exam_type', 'Regular Exam')
                for room in rooms:
                    all_staff = StaffManagement.objects.all()
                    eligible_staff = []
                    for staff in all_staff:
                        req = StaffDutyRequirement.objects.filter(
                            staff_grade=staff.grade, 
                            exam_type=current_type
                        ).first()
                        limit = req.required_count if req else 0
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

                    if eligible_staff:
                        eligible_staff.sort(key=lambda x: x.duty_count)
                        selected_staff = eligible_staff[0]
                        DutyAssignment.objects.create(staff=selected_staff, exam=session, room=room)
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

# --- 6. AUTHENTICATION & PROFILE SETTINGS ---

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

# --- 7. DELETION & HOME ---

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