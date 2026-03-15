from django.contrib import admin
from .models import (
    StaffManagement, ClassroomSetup, ExamSchedule, 
    DutyAssignment, StaffDutyRequirement, StaffAvailability, Timetable
)

@admin.register(StaffAvailability)
class StaffAvailabilityAdmin(admin.ModelAdmin):
    # Added 'day' and 'exam_date' so you can verify Monday AN logic
    list_display = ('staff', 'day', 'exam_date', 'session', 'is_available')
    list_filter = ('day', 'session', 'is_available', 'exam_date')
    search_fields = ('staff__username', 'day')

@admin.register(StaffManagement)
class StaffManagementAdmin(admin.ModelAdmin):
    list_display = (
        'user', 
        'staff_id', 
        'grade', 
        'department', 
        'branch', 
        'internal1_duty_count', 
        'internal2_duty_count', 
        'regular_duty_count', 
        'supply_duty_count'
    )
    search_fields = ('name', 'staff_id')
    fieldsets = (
        ('Staff Details', {
            'fields': ('user', 'staff_id', 'grade', 'department', 'branch', 'phone_number')
        }),
        ('Exam Type Duty Requirements', {
            'description': 'These values represent the duty limits assigned for this specific staff member.',
            'fields': (
                'internal1_duty_count', 
                'internal2_duty_count', 
                'regular_duty_count', 
                'supply_duty_count',
                'duty_count'
            )
        }),
        ('Staff Timetable', {
            'fields': ('timetable_data',)
        }),
    )

@admin.register(ClassroomSetup)
class ClassroomSetupAdmin(admin.ModelAdmin):
    list_display = ('block', 'room_no', 'capacity')

@admin.register(ExamSchedule)
class ExamScheduleAdmin(admin.ModelAdmin):
    list_display = ('subject', 'course_name', 'date', 'exam_type', 'session', 'time_slot')
    list_filter = ('exam_type', 'date', 'session')

@admin.register(StaffDutyRequirement)
class StaffDutyRequirementAdmin(admin.ModelAdmin):
    list_display = ('staff_grade', 'exam_type', 'required_count')
    list_editable = ('required_count',) 
    list_filter = ('exam_type', 'staff_grade')

@admin.register(Timetable)
class TimetableAdmin(admin.ModelAdmin):
    list_display = ('staff', 'day', 'period', 'branch_sem', 'subject')
    list_filter = ('day', 'branch_sem')

admin.site.register(DutyAssignment)