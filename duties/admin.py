from django.contrib import admin
from .models import StaffProfile, Classroom, ExamSession, DutyAssignment

admin.site.register(StaffProfile)
admin.site.register(Classroom)
admin.site.register(ExamSession)
admin.site.register(DutyAssignment)