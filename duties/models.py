from django.db import models
from django.contrib.auth.models import User

class StaffManagement(models.Model):
    # Adding related_name allows request.user.staffmanagement to work in views
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='staffmanagement')
    
    # Adding a name field to store the display name separate from the username
    name = models.CharField(max_length=100, blank=True, null=True)
    staff_id = models.CharField(max_length=20, unique=True)
    department = models.CharField(max_length=100)
    branch = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=15)
    grade = models.CharField(max_length=50, default='Assistant Professor')

    # New individual duty count fields
    internal1_duty_count = models.IntegerField(default=0)
    internal2_duty_count = models.IntegerField(default=0)
    regular_duty_count = models.IntegerField(default=0)
    supply_duty_count = models.IntegerField(default=0)
    
    # Timetable storage using JSONField (Ideal for weekly schedules)
    timetable_data = models.JSONField(default=list, blank=True) 
    duty_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    
    # Profile image requires 'Pillow' library installed (pip install Pillow)
    profile_image = models.ImageField(upload_to='profile_pics/', null=True, blank=True)

    def __str__(self):
        return self.name if self.name else self.user.username

    class Meta:
        verbose_name = "Staff Management"
        verbose_name_plural = "Staff Management"

    def __str__(self):
        return self.name if self.name else self.user.username

class ClassroomSetup(models.Model):
    block = models.CharField(max_length=50)
    room_no = models.CharField(max_length=20)
    capacity = models.IntegerField()
    date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.block} - {self.room_no}"

    class Meta:
        verbose_name = "Classroom Setup"
        verbose_name_plural = "Classroom Setup"

class ExamSchedule(models.Model):
    course_name = models.CharField(max_length=100)
    subject = models.CharField(max_length=100)
    date = models.DateField()
    # Increased length to accommodate session strings like "9:30 AM - 12:30 PM"
    time_slot = models.CharField(max_length=50)
    
    # --- ADDED FIELDS TO SUPPORT FILTERING & DUTY TRACKING ---
    session = models.CharField(max_length=10, default='FN') # e.g., FN or AN
    exam_type = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        verbose_name = "Exam Schedule"
        verbose_name_plural = "Exam Schedule"

# --- NEW MODEL FOR STAFF DUTY COUNT REQUIREMENTS ---
class StaffDutyRequirement(models.Model):
    staff_grade = models.CharField(max_length=100)
    # ADD THIS LINE:
    exam_type = models.CharField(max_length=100, default='Regular Exam') 
    required_count = models.IntegerField(default=0)
    
    # Keep any other existing fields like date or session
    date = models.DateField(null=True, blank=True)
    session = models.CharField(max_length=10, null=True, blank=True)

    def __str__(self):
        return f"{self.staff_grade} - {self.exam_type}: {self.required_count}"

    class Meta:
        unique_together = ('date', 'session', 'staff_grade')
        verbose_name = "Staff Duty Requirement"
        verbose_name_plural = "Staff Duty Requirements"

    def __str__(self):
        return f"{self.date} {self.session} - {self.staff_grade} ({self.required_count})"

class DutyAssignment(models.Model):
    staff = models.ForeignKey(StaffManagement, on_delete=models.CASCADE, related_name='assigned_duties')
    session = models.ForeignKey(ExamSchedule, on_delete=models.CASCADE, related_name='session_assignments')
    room = models.ForeignKey(ClassroomSetup, on_delete=models.CASCADE, related_name='room_assignments')
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.staff.name} - {self.session.subject} ({self.room.room_no})"

    class Meta:
        verbose_name = "Duty Assignment"
        verbose_name_plural = "Duty Assignments"