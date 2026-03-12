from django.contrib import admin
from .models import StaffManagement, ClassroomSetup, ExamSchedule, DutyAssignment, StaffDutyRequirement

@admin.register(StaffManagement)
class StaffManagementAdmin(admin.ModelAdmin):
    # Added specific duty count fields to the list view
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
    
    # Organized the detail view into clear sections
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
    # Added exam_type and session to make it easier to see what type of exam it is
    list_display = ('subject', 'course_name', 'date', 'exam_type', 'session', 'time_slot')
    list_filter = ('exam_type', 'date', 'session')

@admin.register(StaffDutyRequirement)
class StaffDutyRequirementAdmin(admin.ModelAdmin):
    # This shows the "Policy" set by the admin
    list_display = ('staff_grade', 'exam_type', 'required_count')
    list_editable = ('required_count',) 
    list_filter = ('exam_type', 'staff_grade')

admin.site.register(DutyAssignment)