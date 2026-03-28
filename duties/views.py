import os
import logging
import pandas as pd # Ensure pandas is imported for day_name conversion
from django.contrib.auth.models import User
from django.http import HttpResponse
from django.db import transaction
from django.conf import settings
from django.db.models import F # Added for counter updates
from django.db.models.functions import Greatest
from django.http import JsonResponse
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import api_view, permission_classes, parser_classes
from .serializers import (
    AvailabilitySerializer, AssignmentSerializer, StaffManagementSerializer,
    DutyAssignmentSerializer, AllocationSerializer, StaffProfileSerializer
)
# Import all models including Department and Branch
from .models import (
    StaffManagement, StaffAvailability, ExamSchedule, ClassroomSetup, 
    DutyAssignment, StaffDutyRequirement, Department, Branch
)

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
        # Check if date/session filters are passed for status calculation
        exam_date = request.query_params.get('date')
        session = request.query_params.get('session')
        
        staff_members = StaffManagement.objects.all()
        
        # Using the updated serializer with context for the "Allocated" status
        serializer = StaffManagementSerializer(
            staff_members, 
            many=True, 
            context={'date': exam_date, 'session': session}
        )
        return Response(serializer.data)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def update_staff_duty_counts(request):
    # Retrieve 'duties' list from the request
    duties = request.data.get('duties', [])
    if not duties:
        return Response({"error": "No duty data provided"}, status=400)

    try:
        with transaction.atomic():
            for item in duties:
                grade = item.get('grade')
                exam_type = item.get('examType')
                # Ensure count is treated as an integer
                try:
                    count = int(item.get('count', 0))
                except (ValueError, TypeError):
                    count = 0

                if not grade or not exam_type:
                    continue

                # 1. Update the master requirement rule table
                StaffDutyRequirement.objects.update_or_create(
                    staff_grade=grade,
                    exam_type=exam_type,
                    defaults={'required_count': count}
                )

                # 2. Update the actual staff records for the selected grade
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
        
        # 1. Validation: Ensure all necessary fields for the new model are present
        required_fields = ['block', 'room_no', 'capacity', 'date', 'exam_type', 'session']
        if not all(data.get(field) for field in required_fields):
            return Response({
                "error": "Missing required fields. Ensure block, room_no, capacity, date, exam_type, and session are provided."
            }, status=400)

        # 2. Data Cleaning: Ensure capacity is an integer
        try:
            capacity_val = int(data.get('capacity'))
        except (ValueError, TypeError):
            return Response({"error": "Capacity must be a valid number."}, status=400)

        # 3. Database Creation
        ClassroomSetup.objects.create(
            block=data.get('block'),
            room_no=data.get('room_no'),
            capacity=capacity_val,
            date=data.get('date'),
            exam_type=data.get('exam_type'),
            session=data.get('session')
        )

        return Response({"message": "Successfully saved to Classroom Setup!"}, status=201)

    except Exception as e:
        # 4. Error Logging (Helpful for debugging)
        print(f"Error saving classroom: {str(e)}")
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
        "exam_type": r.exam_type,
        "session": r.session,
        "date": r.date.strftime('%Y-%m-%d') if r.date else None 
    } for r in rooms]
    return Response(data)

@api_view(['POST'])
def save_classroom_setup(request):
    # 1. Get data from your frontend form
    date = request.data.get('date')
    session = request.data.get('session')
    rooms_data = request.data.get('rooms') # Assuming a list of rooms
    
    # 2. Save your rooms and trigger the auto-allocation
    for room_info in rooms_data:
        room = ClassroomSetup.objects.create(
            date=date,
            session=session,
            block=room_info['block'],
            room_no=room_info['room_no'],
            exam_type=request.data.get('exam_type')
        )
        
        # This creates the duty and automatically picks the FIFO staff 
        # because of the save() method we added to the DutyAssignment model
        DutyAssignment.objects.create(room=room)

    # ==========================================================
    # PASTE THE BALANCE LOGIC HERE
    # ==========================================================
    # After all rooms are created and staff assigned, 
    # find the staff who didn't get a room and "charge" them a duty.
    
    balance_staff = StaffAvailability.objects.filter(
        exam_date=date, # Corrected field name to exam_date
        session=session, 
        is_assigned=False
    )
    
    for record in balance_staff:
        # Get management profile
        profile = getattr(record.staff, 'staffmanagement', None)
        if profile:
            # Increase their count so they don't get an advantage over others
            profile.regular_duty_count += 1
            profile.save()
        
    # Finally, remove them from availability so they don't show up as 'available'
    balance_staff.delete()
    # ==========================================================

    return Response({"message": "Classrooms created and staff allocated!"})


@transaction.atomic
def auto_allocate_duty(classroom_id):
    # 1. Get the classroom that was just created/saved
    room = get_object_or_404(ClassroomSetup, id=classroom_id)
    
    # 2. Look for available staff matching the exact Date and Session
    # Order by id to ensure FIFO (First-In, First-Out)
    available_staff_record = StaffAvailability.objects.filter(
        exam_date=room.date,
        session=room.session,
        is_assigned=False
    ).order_by('id').first()

    if available_staff_record:
        staff_user = available_staff_record.staff
        staff_profile = getattr(staff_user, 'staffmanagement', None)
        
        # 3. Create the final Duty Assignment
        DutyAssignment.objects.create(
            staff=staff_profile,
            room=room,
            date=room.date,
            session=room.session,
            exam_type=room.exam_type
        )
        
        if staff_profile:
            # 4. Update Staff status so they aren't picked twice for the same time
            staff_profile.regular_duty_count += 1
            staff_profile.save()
        
        # 5. Mark this availability slot as "Used"
        available_staff_record.is_assigned = True
        available_staff_record.save()
        
        return True
    return False

# Cleanup logic for unallocated staff on the same day
def cleanup_unused_staff(date, session):
    unused = StaffAvailability.objects.filter(
        exam_date=date, 
        session=session, 
        is_assigned=False
    )
    for record in unused:
        profile = getattr(record.staff, 'staffmanagement', None)
        if profile:
            profile.regular_duty_count += 1 # Increase count even if not used
            profile.save()
        record.delete() # Remove from pool as requested


@api_view(['POST'])
@permission_classes([IsAdminUser])
def insert_exam_schedule(request):
    data = request.data
    try:
        with transaction.atomic():
            date = data.get('date')
            session = data.get('session', 'FN')
            exam_type = data.get('exam_type')  # The type selected in React (e.g., 'Internal Test 1')
            schedules = data.get('schedules', [])

            # 1. Create/Update Exam Schedules
            for item in schedules:
                ExamSchedule.objects.update_or_create(
                    date=date,
                    session=session,
                    subject=item.get('subject'),
                    defaults={
                        'course_name': f"{item.get('branch')}({item.get('sem')})",
                        'exam_type': exam_type
                    }
                )

            # --- CRITICAL FIX: Update StaffAvailability for ALL staff on this day ---
            # This changes the "Regular" default to the actual exam_type from your form
            StaffAvailability.objects.filter(
                exam_date=date, 
                session=session
            ).update(exam_type=exam_type)

            # 2. Identify rooms for this date/session that don't have a staff assigned yet
            assigned_room_ids = DutyAssignment.objects.filter(
                date=date, 
                session=session
            ).exclude(staff__isnull=True).values_list('room_id', flat=True)

            available_rooms = ClassroomSetup.objects.filter(
                date=date, 
                session=session
            ).exclude(id__in=assigned_room_ids).order_by('id')

            # 3. Get Staff who are available (is_assigned=False)
            available_staff_records = StaffAvailability.objects.select_for_update().filter(
                exam_date=date,
                session=session,
                is_assigned=False,
                is_available=True  # Ensure they are actually marked as available
            ).order_by('id')

            staff_list = list(available_staff_records)
            assignments_made = 0

            # 4. Pair them up
            for i, room_obj in enumerate(available_rooms):
                if i < len(staff_list):
                    avail_record = staff_list[i]
                    staff_profile = getattr(avail_record.staff, 'staffmanagement', None)
                    
                    if staff_profile:
                        # Create or update the DutyAssignment
                        DutyAssignment.objects.update_or_create(
                            room=room_obj,
                            date=date,
                            session=session,
                            defaults={
                                'staff': staff_profile,
                                'exam_type': exam_type
                            }
                        )

                        # Update the availability record
                        avail_record.is_assigned = True
                        avail_record.save()

                        # --- CORRECT COUNTER LOGIC ---
                        etype = str(exam_type).lower()
                        if 'internal 1' in etype or 'internal test 1' in etype:
                            staff_profile.internal1_duty_count += 1
                        elif 'internal 2' in etype or 'internal test 2' in etype:
                            staff_profile.internal2_duty_count += 1
                        elif 'supply' in etype:
                            staff_profile.supply_duty_count += 1
                        else:
                            staff_profile.regular_duty_count += 1
                        
                        staff_profile.save()
                        assignments_made += 1
                else:
                    break

        return Response({
            "message": f"Successfully created schedules and assigned {assignments_made} staff."
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
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

@api_view(['POST'])
@permission_classes([IsAdminUser])
def allocate_staff_to_room(request):
    """
    Manually allocates a staff member to a room.
    Ensures the staff is only assigned to ONE duty per day (FN or AN).
    Updates staff duty counters and availability status.
    """
    staff_id = request.data.get('staff_id')
    room_id = request.data.get('room_id') 

    if not staff_id or not room_id:
        return Response({"error": "Staff ID and Room ID are required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            # 1. Fetch the Staff and Room objects
            staff_profile = get_object_or_404(StaffManagement, id=staff_id)
            room = get_object_or_404(ClassroomSetup, id=room_id)
            exam_date = room.date  

            # 2. SINGLE DUTY PER DAY CHECK
            # Check if this staff is already in DutyAssignment for this specific date
            already_allocated = DutyAssignment.objects.filter(
                staff=staff_profile,
                date=exam_date
            ).exists()

            if already_allocated:
                return Response({
                    "error": f"Allocation Blocked: {staff_profile.name} already has a duty assigned on {exam_date}."
                }, status=status.HTTP_400_BAD_REQUEST)

            # 3. Create the Assignment
            # We use update_or_create to ensure the room is only linked to one person
            assignment, created = DutyAssignment.objects.update_or_create(
                room=room,
                defaults={
                    'staff': staff_profile,
                    'date': exam_date,
                    'session': room.session,
                    'exam_type': room.exam_type
                }
            )

            # 4. Update Staff Personal Duty Counters
            etype = str(room.exam_type).lower()
            if 'internal 1' in etype or 'internal test 1' in etype:
                staff_profile.internal1_duty_count += 1
            elif 'internal 2' in etype or 'internal test 2' in etype:
                staff_profile.internal2_duty_count += 1
            elif 'supply' in etype:
                staff_profile.supply_duty_count += 1
            else:
                staff_profile.regular_duty_count += 1
            
            # Update the main duty_count used for priority logic (FIFO)
            staff_profile.duty_count += 1
            staff_profile.save()

            # 5. Sync with StaffAvailability table
            # Mark them as 'is_assigned=True' so they don't appear as available elsewhere
            StaffAvailability.objects.filter(
                staff=staff_profile.user,
                exam_date=exam_date,
                session=room.session
            ).update(is_assigned=True)

            return Response({
                "message": f"Successfully allocated {staff_profile.name} to {room.room_no} ({room.session})"
            }, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"Manual Allocation Error: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_duty_assignments(request):
    start_date = request.GET.get('start')
    end_date = request.GET.get('end')

    # Filter assignments and pre-fetch related data to avoid 'N/A'
    assignments = DutyAssignment.objects.filter(
        date__range=[start_date, end_date]
    ).select_related('staff', 'room').order_by('date', 'session')

    data = []
    for duty in assignments:
        data.append({
            "exam_date": duty.date.strftime('%d %b %Y') if duty.date else "No Date",
            "exam_session": duty.session or "N/A",
            "exam_type": duty.exam_type or "N/A",
            "block_name": duty.room.block if duty.room else "N/A",
            "room_name": duty.room.room_no if duty.room else "N/A", # Ensure this is room_no
            "staff_name": duty.staff.name if duty.staff else "Waiting...",
            "department": duty.staff.department if duty.staff else "N/A",
            "branch": duty.staff.branch if duty.staff else "N/A",
            "grade": duty.staff.grade if duty.staff else "N/A",
        })

    return JsonResponse(data, safe=False)

def finalize_allocations_for_day(date, session):
    """
    Call this after all classrooms for a specific slot have been saved.
    It clears out the remaining 'Balance' staff.
    """
    from .models import StaffAvailability
    
    remaining_staff = StaffAvailability.objects.filter(
        exam_date=date,
        session=session,
        is_assigned=False
    )
    
    for record in remaining_staff:
        profile = getattr(record.staff, 'staffmanagement', None)
        if profile:
            # Increase count as they were 'ready' for duty
            profile.regular_duty_count += 1
            profile.save()
        # Remove them from the availability pool as per your FIFO rule
        record.delete()

@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_allocated_duties(request):
    """
    Fetches staff duties and accurately maps them to the specific course 
    they were assigned to, even if multiple exams happen in the same slot.
    """
    start_date = request.query_params.get('start')
    end_date = request.query_params.get('end')

    if not start_date or not end_date:
        return Response({"error": "Please provide both start and end dates"}, status=400)

    try:
        # 1. Fetch availability records within range. 
        # We use select_related('staff') to reduce database hits.
        availabilities = StaffAvailability.objects.filter(
            exam_date__range=[start_date, end_date],
            is_available=True
        ).select_related('staff').order_by('exam_date', 'session')

        results = []
        for record in availabilities:
            # Get the staff profile for Dept/Branch/Grade info
            profile = StaffManagement.objects.filter(user=record.staff).first()
            
            # 2. MATCHING LOGIC: 
            # We first check if the availability record itself has the course_name.
            # Then we look up the ExamSchedule for the specific "Exam Type".
            schedule_item = ExamSchedule.objects.filter(
                date=record.exam_date, 
                session=record.session,
                course_name=record.course_name # Link by specific course
            ).first()

            # 3. Determine specific exam details
            # If राजेश is linked to IMCA S2, this will correctly show IMCA S2.
            exam_type = schedule_item.exam_type if schedule_item else "Regular"
            
            results.append({
                "id": record.id,
                "name": getattr(profile, 'name', f"{record.staff.first_name} {record.staff.last_name}"),
                "date": record.exam_date.strftime('%Y-%m-%d'),
                "session": record.session,
                "exam_type": exam_type,
                "course_name": record.course_name, # Critical: "IMCA S2" vs "IMCA S8"
                "department": getattr(profile, 'department', "MCA"),
                "branch": getattr(profile, 'branch', "MCA"),
                "grade": getattr(profile, 'grade', "Assistant Professor")
            })

        return Response({"allocated_staff": results}, status=200)

    except Exception as e:
        logger.error(f"Error in get_allocated_duties: {str(e)}")
        return Response({"error": "Internal Server Error"}, status=500)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def get_available_staff_for_duty(request):
    try:
        # 1. Extract Data
        exam_date = request.data.get('date')
        target_branch_sem = request.data.get('branch_sem') # The branch having the exam
        session = request.data.get('session') # "FN" or "AN"
        
        if not all([exam_date, target_branch_sem, session]):
            return Response({"error": "Missing required fields"}, status=400)

        # 2. Setup Context
        day_name = pd.to_datetime(exam_date).day_name()
        # Define the blocks of periods we need free based on session
        target_periods = ['P1', 'P2', 'P3'] if session == "FN" else ['P4', 'P5', 'P6']
        
        # Get or create the ExamSchedule object for this specific date/session
        # (This ensures we can check DutyAssignment against it)
        exam_schedule, _ = ExamSchedule.objects.get_or_create(
            date=exam_date,
            session=session
        )

        available_staff_list = []
        
        # 3. Optimized Data Fetching
        # Get all staff and pre-fetch their user profiles
        all_staff = StaffManagement.objects.all().select_related('user')
        
        # Get all duties already assigned for this specific schedule
        assigned_staff_ids = DutyAssignment.objects.filter(
            date=exam_date,
            session=session
        ).values_list('staff_id', flat=True)

        for profile in all_staff:
            # 4. Availability Logic (Virtual Cleanup)
            # Find timetable slots for this staff on this day
            # EXCLUDING the branch that is currently having the exam (Virtual Free)
            
            # Note: This logic assumes timetable_data is stored in the profile
            timetable = profile.timetable_data if isinstance(profile.timetable_data, list) else []
            # Day name short (e.g. "Mon")
            day_short = exam_date.strftime('%a') if hasattr(exam_date, 'strftime') else pd.to_datetime(exam_date).strftime('%a')
            
            day_data = next((item for item in timetable if item.get("day") == day_short), None)
            
            is_fully_free = True
            if day_data:
                periods = day_data.get("periods", [])
                # Map P1..P6 to indices 0..5
                target_indices = [0, 1, 2] if session == "FN" else [3, 4, 5]
                
                for idx in target_indices:
                    if idx < len(periods):
                        slot_value = str(periods[idx]).strip() if periods[idx] else ""
                        # If slot has a class AND it's not the branch having the exam, they are busy
                        if slot_value != "" and slot_value != target_branch_sem:
                            is_fully_free = False
                            break

            # 5. Allocation Status Logic
            if is_fully_free:
                is_allocated = profile.id in assigned_staff_ids
                
                available_staff_list.append({
                    "id": profile.id,
                    "name": profile.name or profile.user.get_full_name() or profile.user.username,
                    "department": profile.department or "N/A",
                    "duty_count": profile.regular_duty_count, # Show current count
                    "allocation_status": "Allocated" if is_allocated else "Not Allocated"
                })

        # 6. Final Response
        return Response({
            "exam_details": {
                "date": exam_date,
                "day": day_name,
                "session": session,
                "target_exam_branch": target_branch_sem
            },
            "available_staff": available_staff_list
        }, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_exam_duty_data(request):
    user = request.user
    
    # 1. Fetch Availability 
    availability_qs = StaffAvailability.objects.filter(staff=user)
    
    # 2. Fetch Assignments 
    assignments_qs = DutyAssignment.objects.filter(staff__user=user)
    
    return Response({
        "availability": AvailabilitySerializer(availability_qs, many=True).data,
        "allocations": AssignmentSerializer(assignments_qs, many=True).data
    })

# --- 5. DASHBOARD & ALLOCATION ---

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def staff_dashboard(request):
    try:
        # 1. Fetch the profile
        profile = get_object_or_404(StaffManagement, user=request.user)
        
        # 2. Handle Profile Picture URL
        image_url = None
        if profile.profile_pic:
            image_url = request.build_absolute_uri(profile.profile_pic.url)
        else:
            # Fallback to a placeholder if no image exists
            image_url = "https://via.placeholder.com/150"

        # 3. Return the response
        return Response({
            "profile": {
                "name": profile.name or request.user.get_full_name() or request.user.username,
                "email": request.user.email,
                "phone_number": profile.phone_number,
                "grade": profile.grade,  
                "department": profile.department,
                "branch": profile.branch,
                "staff_id": profile.staff_id,
                "image_url": image_url,
                "internal1_duty_count": profile.internal1_duty_count,
                "internal2_duty_count": profile.internal2_duty_count,
                "regular_duty_count": profile.regular_duty_count,
                "supply_duty_count": profile.supply_duty_count,
                "total_duty_count": (profile.internal1_duty_count + profile.internal2_duty_count + 
                                   profile.regular_duty_count + profile.supply_duty_count),
            },
            "timetable": profile.timetable_data or []
        })
    except Exception as e:
        print(f"CRITICAL DASHBOARD ERROR: {str(e)}")
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_profile_image(request):
    try:
        # 1. Access the linked StaffManagement profile
        profile = getattr(request.user, 'staffmanagement', None)
        if not profile:
            return Response({"error": "Staff profile not found"}, status=status.HTTP_404_NOT_FOUND)

        # 2. Check if 'profile_pic' exists in the request
        if 'profile_pic' not in request.FILES:
            return Response({"error": "No file uploaded. Key must be 'profile_pic'"}, status=status.HTTP_400_BAD_REQUEST)

        new_image = request.FILES['profile_pic']

        # 3. File Cleanup: Delete the old image file from storage if it exists
        if profile.profile_pic:
            old_path = profile.profile_pic.path
            if os.path.exists(old_path):
                os.remove(old_path)

        # 4. Save the new image
        profile.profile_pic = new_image
        profile.save()

        # 5. Return the full URL for React to display immediately
        return Response({
            "message": "Image uploaded successfully",
            "image_url": request.build_absolute_uri(profile.profile_pic.url)
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def allocate_duties(request):
    try:
        with transaction.atomic():
            DutyAssignment.objects.all().delete()
            # Resetting counts based on your specific requirements
            StaffManagement.objects.all().update(
                internal1_duty_count=0,
                internal2_duty_count=0,
                regular_duty_count=0,
                supply_duty_count=0
            )
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
                        
                        etype = current_type.upper()
                        if "INTERNAL TEST 1" in etype:
                            current_staff_count = staff.internal1_duty_count
                        elif "INTERNAL TEST 2" in etype:
                            current_staff_count = staff.internal2_duty_count
                        elif "REGULAR" in etype:
                            current_staff_count = staff.regular_duty_count
                        elif "SUPPLY" in etype:
                            current_staff_count = staff.supply_duty_count

                        if current_staff_count < limit:
                            eligible_staff.append(staff)

                    if eligible_staff:
                        # Sort by their specific counter for that exam type to maintain balance
                        eligible_staff.sort(key=lambda x: (
                            x.internal1_duty_count if "INTERNAL TEST 1" in current_type.upper() else
                            x.internal2_duty_count if "INTERNAL TEST 2" in current_type.upper() else
                            x.supply_duty_count if "SUPPLY" in current_type.upper() else
                            x.regular_duty_count
                        ))
                        selected_staff = eligible_staff[0]
                        DutyAssignment.objects.create(
                            staff=selected_staff, 
                            room=room,
                            date=room.date,
                            session=room.session,
                            exam_type=current_type
                        )
                        
                        etype = current_type.upper()
                        if "INTERNAL TEST 1" in etype:
                            selected_staff.internal1_duty_count += 1
                        elif "INTERNAL TEST 2" in etype:
                            selected_staff.internal2_duty_count += 1
                        elif "REGULAR" in etype:
                            selected_staff.regular_duty_count += 1
                        elif "SUPPLY" in etype:
                            selected_staff.supply_duty_count += 1
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
        with transaction.atomic():
            # 1. Get the room
            room = get_object_or_404(ClassroomSetup, id=id)
            exam_type = room.exam_type
            
            # 2. Find the DutyAssignment linked to this specific room
            # We use select_related to get the staff profile immediately
            assignment = DutyAssignment.objects.filter(room=room).first()
            
            if assignment and assignment.staff:
                staff_profile = assignment.staff
                
                # 3. Decrement the specific count (Refund the duty)
                # Note: We decrease the count because the duty is being cancelled
                etype = str(exam_type).lower()
                if 'internal 1' in etype or 'internal test 1' in etype:
                    staff_profile.internal1_duty_count = max(0, staff_profile.internal1_duty_count - 1)
                elif 'internal 2' in etype or 'internal test 2' in etype:
                    staff_profile.internal2_duty_count = max(0, staff_profile.internal2_duty_count - 1)
                elif 'supply' in etype:
                    staff_profile.supply_duty_count = max(0, staff_profile.supply_duty_count - 1)
                else:
                    staff_profile.regular_duty_count = max(0, staff_profile.regular_duty_count - 1)
                
                # Also update the total duty_count if you use it for FIFO
                staff_profile.duty_count = max(0, staff_profile.duty_count - 1)
                staff_profile.save()

                # 4. Handle StaffAvailability
                # Since the room is deleted, the staff should become "Available" again for that slot
                from .models import StaffAvailability
                StaffAvailability.objects.filter(
                    staff=staff_profile.user,
                    exam_date=room.date,
                    session=room.session
                ).update(is_assigned=False)

            # 5. Delete the room
            # Because of the assignment logic, we delete the room last
            room.delete()
            
            return Response({"message": "Room deleted and staff counts refunded"}, status=200)

    except ClassroomSetup.DoesNotExist:
        return Response({"error": "Room not found"}, status=404)
    except Exception as e:
        logger.error(f"Error deleting room: {str(e)}")
        return Response({"error": str(e)}, status=400)

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