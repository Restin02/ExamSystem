from django.db import models
from django.contrib.auth.models import User

# 1. Staff Profile: Stores teacher details and duty counts
class StaffProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    department = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    duty_count = models.IntegerField(default=0)
    timetable = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return self.user.username
        
# 2. Classroom: Stores where the exams happen
class Classroom(models.Model):
    room_number = models.CharField(max_length=10)
    building_block = models.CharField(max_length=50)
    capacity = models.IntegerField()

    def __str__(self):
        return f"Room {self.room_number} - {self.building_block}"

# 3. Exam Session: Stores when the exams happen
class ExamSession(models.Model):
    course_name = models.CharField(max_length=200)
    date = models.DateField()
    time_slot = models.CharField(max_length=50) # Morning or Afternoon

    def __str__(self):
        return f"{self.course_name} on {self.date}"

# 4. Duty Assignment: The "Result" (Who is where and when)
class DutyAssignment(models.Model):
    staff = models.ForeignKey(StaffProfile, on_delete=models.CASCADE)
    session = models.ForeignKey(ExamSession, on_delete=models.CASCADE)
    room = models.ForeignKey(Classroom, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.staff.user.username} - {self.room.room_number}"