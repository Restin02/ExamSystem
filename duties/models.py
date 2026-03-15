from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from datetime import datetime
import re
from django.db.models.signals import post_delete

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

    internal1_duty_count = models.IntegerField(default=0)
    internal2_duty_count = models.IntegerField(default=0)
    regular_duty_count = models.IntegerField(default=0)
    supply_duty_count = models.IntegerField(default=0)
    duty_count = models.IntegerField(default=0)
    
    timetable_data = models.JSONField(default=list, blank=True) 
    profile_image = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)

    class Meta:
        verbose_name = "Staff Management"
        verbose_name_plural = "Staff Management"

    def __str__(self):
        return self.name if self.name else self.user.username

# --- CLASSROOM & EXAM SETUP ---

class ClassroomSetup(models.Model):
    block = models.CharField(max_length=50)
    room_no = models.CharField(max_length=20)
    capacity = models.IntegerField()
    date = models.DateField(null=True, blank=True)
    session = models.CharField(max_length=2, default='FN')

    class Meta:
        verbose_name = "Classroom Setup"
        verbose_name_plural = "Classroom Setup"

    def __str__(self):
        return f"{self.block} - {self.room_no}"

class ExamSchedule(models.Model):
    course_name = models.CharField(max_length=100) 
    subject = models.CharField(max_length=100)
    date = models.DateField()
    time_slot = models.CharField(max_length=50)
    session = models.CharField(max_length=10, default='FN') 
    exam_type = models.CharField(max_length=50, blank=True, null=True)

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

    class Meta:
        unique_together = ('date', 'session', 'staff_grade')
        verbose_name = "Staff Duty Requirement"
        verbose_name_plural = "Staff Duty Requirements"

    def __str__(self):
        return f"{self.staff_grade} - {self.exam_type} ({self.required_count})"

class DutyAssignment(models.Model):
    staff = models.ForeignKey(StaffManagement, on_delete=models.CASCADE, related_name='assigned_duties')
    exam_schedule = models.ForeignKey(ExamSchedule, on_delete=models.CASCADE, related_name='assignments', null=True, blank=True )
    room = models.ForeignKey(ClassroomSetup, on_delete=models.CASCADE, related_name='room_assignments')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Duty Assignment"
        verbose_name_plural = "Duty Assignments"

    def __str__(self):
        return f"{self.staff.name} - {self.exam_schedule.subject if self.exam_schedule else 'No Schedule'}"

# --- TIMETABLE & SYSTEM LOGIC ---

class Timetable(models.Model):
    staff = models.ForeignKey(User, on_delete=models.CASCADE)
    day = models.CharField(max_length=10) 
    period = models.CharField(max_length=2) 
    branch_sem = models.CharField(max_length=10) 
    subject = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.staff.username} - {self.day} {self.period}"

class StaffAvailability(models.Model):
    staff = models.ForeignKey(User, on_delete=models.CASCADE)
    exam_date = models.DateField()
    day = models.CharField(max_length=20, blank=True, null=True)
    session = models.CharField(max_length=2) 
    is_available = models.BooleanField(default=False)
    # Ensure this matches your migration (added blank=True to avoid NOT NULL errors)
    free_periods = models.CharField(max_length=100, blank=True, default="") 
    course_name = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        unique_together = ('staff', 'exam_date', 'session', 'course_name')

    def __str__(self):
        return f"{self.staff.username} - {self.day} {self.session}"

# --- AUTOMATION SIGNAL ---

def clean_name(name):
    """Removes all non-alphanumeric characters and converts to uppercase."""
    if not name:
        return ""
    return re.sub(r'[^A-Z0-9]', '', name.upper())


# --- HELPER FUNCTION ---
def clean_name(text):
    """Standardizes course names: 'IMCA (S6)' -> 'IMCAS6'"""
    if not text: return ""
    return re.sub(r'[^A-Z0-9]', '', str(text).upper())

# --- AUTOMATION SIGNALS ---

@receiver(post_save, sender=ExamSchedule)
def auto_calculate_availability(sender, instance, created, **kwargs):
    """Triggered whenever an exam is created or updated."""
    print(f"--- Recalculating Session Availability for {instance.date} {instance.session} ---")
    
    # 1. Setup Date & Session Parameters
    d = instance.date
    date_obj = datetime.strptime(d, '%Y-%m-%d').date() if isinstance(d, str) else d
    exam_day_short = date_obj.strftime('%a') 
    target_indices = [0, 1, 2] if instance.session == 'FN' else [3, 4, 5]

    # 2. Get ALL exams scheduled for this date and session
    active_exams = ExamSchedule.objects.filter(date=date_obj, session=instance.session)
    active_exam_courses = [clean_name(e.course_name) for e in active_exams]
    
    all_staff = StaffManagement.objects.filter(department__icontains="MCA")

    for staff_member in all_staff:
        is_busy_with_non_exam_batch = False
        is_freed_by_an_exam = False
        has_any_classes = False
        
        day_data = next((item for item in staff_member.timetable_data if item["day"] == exam_day_short), None)

        if day_data:
            periods = day_data.get("periods", [])
            for idx in target_indices:
                if idx < len(periods):
                    slot_value = str(periods[idx]).strip() if periods[idx] else ""
                    if slot_value == "": continue
                    
                    has_any_classes = True
                    clean_slot = clean_name(slot_value)
                    
                    if clean_slot in active_exam_courses:
                        is_freed_by_an_exam = True
                    else:
                        is_busy_with_non_exam_batch = True

        # --- THE DECISION GATE ---
        should_be_available = False
        if not has_any_classes:
            should_be_available = True
        elif is_freed_by_an_exam and not is_busy_with_non_exam_batch:
            should_be_available = True

        if should_be_available:
            # TO FIX YOUR ERROR: Delete any existing rows for this staff/date/session 
            # before updating to ensure we never have more than one row.
            StaffAvailability.objects.filter(
                staff=staff_member.user,
                exam_date=date_obj,
                session=instance.session
            ).delete()

            StaffAvailability.objects.create(
                staff=staff_member.user,
                exam_date=date_obj,
                session=instance.session,
                day=date_obj.strftime('%A'),
                is_available=True,
                course_name="Session-Wide",
                free_periods=""
            )
        else:
            # If not available, remove all records for this staff/session
            StaffAvailability.objects.filter(
                staff=staff_member.user,
                exam_date=date_obj,
                session=instance.session
            ).delete()

@receiver(post_delete, sender=ExamSchedule)
def cleanup_availability_on_delete(sender, instance, **kwargs):
    """Triggered when an exam is deleted."""
    d = instance.date
    date_obj = datetime.strptime(d, '%Y-%m-%d').date() if isinstance(d, str) else d
    
    remaining_exams = ExamSchedule.objects.filter(date=date_obj, session=instance.session)
    
    if not remaining_exams.exists():
        # Session is empty - clear all availability
        StaffAvailability.objects.filter(exam_date=date_obj, session=instance.session).delete()
    else:
        # Re-trigger calculation using one of the remaining exams
        # We wrap this in a try/except to prevent deletion crashes
        try:
            auto_calculate_availability(sender=ExamSchedule, instance=remaining_exams.first(), created=True)
        except Exception as e:
            print(f"Error during recalculation: {e}")