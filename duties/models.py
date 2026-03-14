from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from datetime import datetime

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

    class Meta:
        verbose_name = "Classroom Setup"
        verbose_name_plural = "Classroom Setup"

    def __str__(self):
        return f"{self.block} - {self.room_no}"

class ExamSchedule(models.Model):
    course_name = models.CharField(max_length=100) # e.g., "MCA(S2)"
    subject = models.CharField(max_length=100)
    date = models.DateField()
    time_slot = models.CharField(max_length=50)
    session = models.CharField(max_length=10, default='FN') # FN or AN
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
    day = models.CharField(max_length=10) # Monday, Tuesday...
    period = models.CharField(max_length=2) # P1, P2...
    branch_sem = models.CharField(max_length=10) # IMCAS2, MCAS4...
    subject = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.staff.username} - {self.day} {self.period}"

class StaffAvailability(models.Model):
    staff = models.ForeignKey(User, on_delete=models.CASCADE)
    exam_date = models.DateField()
    session = models.CharField(max_length=2) # FN or AN
    is_available = models.BooleanField(default=False)
    free_periods = models.CharField(max_length=100, blank=True) 

    class Meta:
        unique_together = ('staff', 'exam_date', 'session')

    def __str__(self):
        return f"{self.staff.username} - {self.exam_date} ({self.session})"

# --- AUTOMATION SIGNAL ---

@receiver(post_save, sender=ExamSchedule)
def auto_calculate_availability(sender, instance, created, **kwargs):
    if created:
        # 1. Handle the date conversion safely
        from datetime import datetime, date
        
        d = instance.date
        if isinstance(d, str):
            date_obj = datetime.strptime(d, '%Y-%m-%d').date()
        else:
            date_obj = d
            
        exam_day = date_obj.strftime('%A')
        target_course = instance.course_name
        
        # 2. Determine session periods
        if instance.session == 'FN':
            target_periods = ['P1', 'P2', 'P3']
        else:
            target_periods = ['P4', 'P5', 'P6']

        # 3. Get staff and calculate
        all_staff = User.objects.filter(is_staff=True, is_superuser=False)

        for staff_user in all_staff:
            # Cleanup Rule: Find classes NOT involving the current exam course
            conflicting_classes = Timetable.objects.filter(
                staff=staff_user,
                day=exam_day,
                period__in=target_periods
            ).exclude(branch_sem=target_course)

            if not conflicting_classes.exists():
                StaffAvailability.objects.update_or_create(
                    staff=staff_user,
                    exam_date=date_obj,
                    session=instance.session,
                    defaults={'is_available': True}
                )