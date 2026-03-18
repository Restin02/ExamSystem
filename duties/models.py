from django.db import models, transaction
from django.contrib.auth.models import User
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import F, Case, When, Value
from django.db.models.functions import Greatest
from datetime import datetime
import re
import logging

# Initialize Logger
logger = logging.getLogger(__name__)

# --- DEPARTMENT & BRANCH SETUP ---

class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class Branch(models.Model):
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='branches')
    name = models.CharField(max_length=100)
    sem_count = models.IntegerField(default=8)

    class Meta:
        unique_together = ('department', 'name')

    def __str__(self):
        return f"{self.department.name} - {self.name}"

# --- STAFF MANAGEMENT ---

class StaffManagement(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='staffmanagement')
    name = models.CharField(max_length=100, blank=True, null=True)
    staff_id = models.CharField(max_length=20, unique=True)
    department = models.CharField(max_length=100)
    branch = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=15)
    grade = models.CharField(max_length=50, default='Assistant Professor')

    # Specific Duty Balances
    internal1_duty_count = models.IntegerField(default=0)
    internal2_duty_count = models.IntegerField(default=0)
    regular_duty_count = models.IntegerField(default=0)
    supply_duty_count = models.IntegerField(default=0)
    
    # Lifetime/Total Count
    duty_count = models.IntegerField(default=0)
    
    # JSON storage for the 7-period weekly structure
    timetable_data = models.JSONField(default=list, blank=True) 
    profile_pic = models.ImageField(upload_to='profiles/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)

    class Meta:
        verbose_name = "Staff Management"
        verbose_name_plural = "Staff Management"

    def __str__(self):
        return self.name if self.name else self.user.username

# --- CLASSROOM & EXAM SETUP ---

class ClassroomSetup(models.Model):
    EXAM_TYPE_CHOICES = [
        ('Regular', 'Regular'),
        ('Internal Test 1', 'Internal Test 1'),
        ('Internal Test 2', 'Internal Test 2'),
        ('Supplementary', 'Supplementary'),
    ]
    SESSION_CHOICES = [('FN', 'FN'), ('AN', 'AN')]

    block = models.CharField(max_length=50)
    room_no = models.CharField(max_length=20)
    capacity = models.IntegerField()
    date = models.DateField(null=True, blank=True)
    exam_type = models.CharField(max_length=50, choices=EXAM_TYPE_CHOICES, default='Regular')
    session = models.CharField(max_length=10, choices=SESSION_CHOICES, default='FN')

    class Meta:
        verbose_name = "Classroom Setup"
        verbose_name_plural = "Classroom Setup"

    def __str__(self):
        return f"{self.block} - {self.room_no} ({self.session})"

class ExamSchedule(models.Model):
    course_name = models.CharField(max_length=100) 
    subject = models.CharField(max_length=100)
    date = models.DateField()
    time_slot = models.CharField(max_length=50)
    session = models.CharField(max_length=10, default='FN') 
    exam_type = models.CharField(max_length=50, blank=True, null=True)
    pass

    class Meta:
        verbose_name = "Exam Schedule"
        verbose_name_plural = "Exam Schedule"

    def __str__(self):
        return f"{self.course_name} - {self.subject} ({self.date})"

# --- DUTY ALLOCATION & AVAILABILITY ---

class StaffDutyRequirement(models.Model):
    staff_grade = models.CharField(max_length=100)
    exam_type = models.CharField(max_length=100, default='Regular Exam') 
    required_count = models.IntegerField(default=0)
    date = models.DateField(null=True, blank=True)
    session = models.CharField(max_length=10, null=True, blank=True)
    pass

    class Meta:
        unique_together = ('date', 'session', 'staff_grade')
        verbose_name = "Staff Duty Requirement"
        verbose_name_plural = "Staff Duty Requirements"

    def __str__(self):
        return f"{self.staff_grade} - {self.exam_type} ({self.required_count})"

class DutyAssignment(models.Model):
    staff = models.ForeignKey('StaffManagement', on_delete=models.CASCADE, null=True, blank=True, related_name='assigned_duties')
    room = models.ForeignKey('ClassroomSetup', on_delete=models.CASCADE, related_name='room_assignments')
    date = models.DateField(null=True, blank=True)
    session = models.CharField(max_length=10, null=True, blank=True)
    exam_type = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)

    class Meta:
        unique_together = ('staff', 'date', 'session')

    def save(self, *args, **kwargs):
        if self.room:
            self.date = self.date or self.room.date
            self.session = self.session or self.room.session
            self.exam_type = self.exam_type or self.room.exam_type

        if not self.staff:
            # We must use 'exam_date' to match the StaffAvailability model
            match = StaffAvailability.objects.filter(
                exam_date=self.date, 
                session=self.session,
                is_assigned=True
            ).order_by('id').first()

            if match:
                # Get the StaffManagement profile linked to this User
                profile = StaffManagement.objects.get(user=match.staff)
                self.staff = profile
                
                # Update status
                match.is_assigned = True
                match.save()
                
                profile.duty_count += 1
                profile.save()
            else:
                logger.warning(f"No available staff for {self.date} {self.session}")

        super().save(*args, **kwargs)

class StaffAvailability(models.Model):
    staff = models.ForeignKey(User, on_delete=models.CASCADE)
    exam_date = models.DateField()
    day = models.CharField(max_length=20, blank=True, null=True)
    session = models.CharField(max_length=2) 
    is_available = models.BooleanField(default=False)
    is_assigned = models.BooleanField(default=False)
    free_periods = models.CharField(max_length=100, blank=True, default="") 
    course_name = models.CharField(max_length=100, blank=True, null=True)

    EXAM_TYPE_CHOICES = [
        ('Regular', 'Regular'),
        ('Internal Test 1', 'Internal Test 1'),
        ('Internal Test 2', 'Internal Test 2'),
        ('Supplementary', 'Supplementary'),
    ]
    exam_type = models.CharField(
        max_length=50, 
        choices=EXAM_TYPE_CHOICES, 
        default='Regular'
    )

    class Meta:
        unique_together = ('staff', 'exam_date', 'session','exam_type', 'course_name')

    def __str__(self):
        return f"{self.staff.username} - {self.exam_date} ({self.exam_type})"

class Timetable(models.Model):
    staff = models.ForeignKey(User, on_delete=models.CASCADE)
    day = models.CharField(max_length=10) 
    period = models.CharField(max_length=2) 
    branch_sem = models.CharField(max_length=10) 
    subject = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.staff.username} - {self.day} {self.period}"

        
# --- AUTOMATION SIGNALS ---

def clean_name(text):
    """Standardizes strings: 'IMCA (S6)' -> 'IMCAS6'"""
    if not text: return ""
    return re.sub(r'[^A-Z0-9]', '', str(text).upper())

@receiver(post_save, sender='duties.ExamSchedule')
def auto_calculate_availability(sender, instance, created, **kwargs):
    """
    Allocates staff to a specific course exam.
    Appends new allocations for new courses in the same session.
    """
    from .models import StaffAvailability, StaffManagement, ExamSchedule
    
    # 1. Date and Session Setup
    d = instance.date
    date_obj = datetime.strptime(d, '%Y-%m-%d').date() if isinstance(d, str) else d
    exam_day_short = date_obj.strftime('%a') 
    target_indices = [0, 1, 2] if instance.session == 'FN' else [3, 4, 5]

    # 2. Map Exam Type to Duty Field
    type_str = (instance.exam_type or "Regular").upper()
    if "INTERNAL TEST 1" in type_str:
        duty_field = 'internal1_duty_count'
    elif "INTERNAL TEST 2" in type_str:
        duty_field = 'internal2_duty_count'
    elif "SUPPLEMENTARY" in type_str or "SUPPLY" in type_str:
        duty_field = 'supply_duty_count'
    else:
        duty_field = 'regular_duty_count'

    # 3. Identify courses having exams
    active_exams = ExamSchedule.objects.filter(date=date_obj, session=instance.session)
    active_exam_courses = [clean_name(e.course_name) for e in active_exams]
    
    # 4. Filter Staff Pool
    staff_with_balance = StaffManagement.objects.filter(**{f"{duty_field}__gt": 0})
    
    # To prevent assigning the SAME staff member to multiple courses in the same session
    # We fetch who is already busy in this specific session (Monday AN)
    busy_staff_ids = set(
        StaffAvailability.objects.filter(
            exam_date=date_obj, 
            session=instance.session
        ).values_list('staff_id', flat=True)
    )

    available_pool = []
    for staff in staff_with_balance:
        # If Jijo is already assigned to IMCA S2, he is 'busy', so we skip him for IMCA S8
        if staff.user.id in busy_staff_ids:
            continue

        is_busy_non_exam = False
        is_freed_by_exam = False
        has_any_classes = False
        
        timetable = staff.timetable_data if isinstance(staff.timetable_data, list) else []
        day_data = next((item for item in timetable if item.get("day") == exam_day_short), None)

        if day_data:
            periods = day_data.get("periods", [])
            for idx in target_indices:
                if idx < len(periods):
                    slot_value = str(periods[idx]).strip() if periods[idx] else ""
                    if slot_value == "": continue
                    
                    has_any_classes = True
                    clean_slot = clean_name(slot_value)
                    
                    if clean_slot in active_exam_courses:
                        is_freed_by_exam = True
                    else:
                        is_busy_non_exam = True

        # Logic: Available if free hours OR teaching an exam batch
        if not has_any_classes or (is_freed_by_exam and not is_busy_non_exam):
            available_pool.append(staff)

    # 5. Priority Sorting (Grade -> Balance -> ID)
    available_pool.sort(key=lambda s: (
        1 if 'ASSISTANT' in str(s.grade).upper() else 2 if 'ASSOCIATE' in str(s.grade).upper() else 3,
        -getattr(s, duty_field, 0),
        -s.id 
    ))

    # 6. Allocation (Atomic Append)
    try:
        with transaction.atomic():
            for staff_profile in available_pool:
                # Check if this specific user already has a record for THIS specific course
                # This check ensures we APPEND for IMCA S8 even if IMCA S2 exists.
                exists = StaffAvailability.objects.filter(
                    staff=staff_profile.user, 
                    exam_date=date_obj, 
                    session=instance.session,
                    course_name=instance.course_name
                ).exists()

                if not exists:
                    # CREATE NEW RECORD (APPENDS to the table)
                    StaffAvailability.objects.create(
                        staff=staff_profile.user,
                        exam_date=date_obj,
                        session=instance.session,
                        day=date_obj.strftime('%A'),
                        is_available=True,
                        course_name=instance.course_name # e.g., 'IMCA S8'
                    )

                    # Deduct balance
                    StaffManagement.objects.filter(id=staff_profile.id).update(
                        **{duty_field: Greatest(F(duty_field) - 1, 0)}
                    )
                    
                    # Mark as busy for the rest of this transaction's loop
                    busy_staff_ids.add(staff_profile.user.id)
                    
                    # If you only need 1 staff member per course creation, uncomment 'break'
                    # break 

    except Exception as e:
        print(f"Error during allocation: {e}")


@receiver(post_delete, sender='duties.ExamSchedule')
def cleanup_and_reallocate_staff(sender, instance, **kwargs):
    """
    1. Identifies staff assigned to the deleted course (e.g., Rajesh for IMCA S2).
    2. Checks if there are other exams in the same slot (e.g., IMCA S8) that need staff.
    3. Verifies if the staff's original timetable allows them to cover the remaining exam.
    4. Reallocates them if possible; otherwise, refunds their duty count.
    """
    from .models import StaffAvailability, StaffManagement, StaffDutyRequirement, ExamSchedule

    d = instance.date
    date_obj = datetime.strptime(d, '%Y-%m-%d').date() if isinstance(d, str) else d
    exam_day_short = date_obj.strftime('%a')
    session = instance.session
    target_indices = [0, 1, 2] if session == 'FN' else [3, 4, 5]

    # Map Exam Type to Duty Field
    type_str = (instance.exam_type or "Regular").upper()
    if "INTERNAL TEST 1" in type_str:
        duty_field, req_type = 'internal1_duty_count', "INTERNAL TEST 1"
    elif "INTERNAL TEST 2" in type_str:
        duty_field, req_type = 'internal2_duty_count', "INTERNAL TEST 2"
    elif "SUPPLEMENTARY" in type_str or "SUPPLY" in type_str:
        duty_field, req_type = 'supply_duty_count', "SUPPLEMENTARY"
    else:
        duty_field, req_type = 'regular_duty_count', "REGULAR"

    with transaction.atomic():
        # 1. Get staff who were assigned ONLY to this specific deleted course
        staff_to_process = StaffAvailability.objects.filter(
            exam_date=date_obj,
            session=session,
            course_name=instance.course_name
        )

        # 2. Find other exams in the same slot that might need staff
        # (Excluding the one we just deleted)
        remaining_exams = ExamSchedule.objects.filter(
            date=date_obj,
            session=session
        ).exclude(course_name=instance.course_name)

        active_exam_course_names = [e.course_name for e in remaining_exams]

        for record in staff_to_process:
            profile = StaffManagement.objects.filter(user=record.staff).first()
            if not profile:
                continue

            reassigned = False

            # 3. REALLOCATION LOGIC:
            # Check if this staff can be moved to any of the remaining exams
            for other_exam in remaining_exams:
                # Check staff timetable: are they free from regular classes?
                # or is their class 'freed' by the remaining exam?
                timetable = profile.timetable_data if isinstance(profile.timetable_data, list) else []
                day_data = next((item for item in timetable if item.get("day") == exam_day_short), None)
                
                is_busy_with_other_class = False
                if day_data:
                    periods = day_data.get("periods", [])
                    for idx in target_indices:
                        if idx < len(periods):
                            slot_val = str(periods[idx]).strip() if periods[idx] else ""
                            # If they have a class, and that class is NOT one of the current exams
                            if slot_val != "" and slot_val not in active_exam_course_names:
                                is_busy_with_other_class = True
                                break
                
                if not is_busy_with_other_class:
                    # Move Rajesh to IMCA S8 instead of deleting him
                    record.course_name = other_exam.course_name
                    record.save()
                    reassigned = True
                    logger.info(f"Reallocated {profile.name} to {other_exam.course_name}")
                    break 

            # 4. REFUND LOGIC:
            # If we couldn't reassign them, refund the count and delete the record
            if not reassigned:
                req_record = StaffDutyRequirement.objects.filter(
                    staff_grade=profile.grade,
                    exam_type=req_type
                ).first()
                
                max_limit = req_record.required_count if req_record else 99

                StaffManagement.objects.filter(user=record.staff).update(
                    **{duty_field: Case(
                        When(**{f"{duty_field}__lt": max_limit}, then=F(duty_field) + 1),
                        default=F(duty_field),
                    )}
                )
                record.delete()


def check_staff_slot_status(staff_user, exam_date, session):
    """Utility to check if staff is free or assigned."""
    from .models import StaffAvailability
    current_duty = StaffAvailability.objects.filter(
        staff=staff_user,
        exam_date=exam_date,
        session=session
    ).first()
    
    if current_duty:
        return f"BUSY ({current_duty.course_name})"
    return "FREE"


@receiver(post_save, sender=ClassroomSetup)
def allocate_staff_to_classroom(sender, instance, created, **kwargs):
    """
    When a classroom is created, we just create a blank DutyAssignment.
    The DutyAssignment.save() method (above) will handle the FIFO matching.
    """
    if created:
        try:
            # We don't need transaction.atomic here because .save() handles it
            DutyAssignment.objects.create(
                room=instance,
                date=instance.date,
                session=instance.session,
                exam_type=instance.exam_type
            )
        except Exception as e:
            logger.error(f"Error triggering duty assignment: {e}")