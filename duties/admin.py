from django.contrib import admin
from .models import StaffManagement, ClassroomSetup, ExamSchedule, DutyAssignment

@admin.register(StaffManagement)
class StaffManagementAdmin(admin.ModelAdmin):
    list_display = ('user', 'staff_id', 'department', 'branch', 'duty_count')
    # Rename the section title in the detail view
    fieldsets = (
        ('Staff Details', {'fields': ('user', 'staff_id', 'grade', 'department', 'branch', 'phone_number')}),
        ('Staff Timetable', {'fields': ('timetable_data',)}),
    )

@admin.register(ClassroomSetup)
class ClassroomSetupAdmin(admin.ModelAdmin):
    list_display = ('block', 'room_no', 'capacity')

@admin.register(ExamSchedule)
class ExamScheduleAdmin(admin.ModelAdmin):
    list_display = ('subject', 'course_name', 'date', 'time_slot')

admin.site.register(DutyAssignment)