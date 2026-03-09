from django.db import models
from django.contrib.auth.models import User

class StaffManagement(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    staff_id = models.CharField(max_length=20, unique=True)
    department = models.CharField(max_length=100)
    branch = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=15)
    grade = models.CharField(max_length=50, default='Assistant Professor')
    timetable_data = models.JSONField(default=list, blank=True) # Keyword: Staff Timetable
    duty_count = models.IntegerField(default=0)
    profile_image = models.ImageField(upload_to='profile_pics/', null=True, blank=True)

    class Meta:
        verbose_name = "Staff Management"
        verbose_name_plural = "Staff Management"

    def __str__(self):
        return self.user.first_name

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
    time_slot = models.CharField(max_length=10)

    class Meta:
        verbose_name = "Exam Schedule"
        verbose_name_plural = "Exam Schedule"

class DutyAssignment(models.Model):
    staff = models.ForeignKey(StaffManagement, on_delete=models.CASCADE)
    session = models.ForeignKey(ExamSchedule, on_delete=models.CASCADE)
    room = models.ForeignKey(ClassroomSetup, on_delete=models.CASCADE)