from django.contrib import admin
from .models import (
    StaffManagement, ClassroomSetup, ExamSchedule, 
    DutyAssignment, StaffDutyRequirement, StaffAvailability, Timetable
)


@admin.register(StaffAvailability)
class StaffAvailabilityAdmin(admin.ModelAdmin):
    # Added 'day' and 'exam_date' so you can verify Monday AN logic
    list_display = ('staff', 'day', 'exam_date', 'session','exam_type', 'is_available')
    list_filter = ('day', 'session', 'is_available','exam_type', 'exam_date')
    search_fields = ('staff__user__username', 'day') # Adjusted search path for staff

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
    search_fields = ('user__first_name', 'user__last_name', 'staff_id') # Search by linked User names
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
    def save_model(self, request, obj, form, change):
        # 1. Save the classroom first
        super().save_model(request, obj, form, change)
        
        # 2. Check if a duty already exists for this room
        if not DutyAssignment.objects.filter(room=obj).exists():
            # 3. Create the duty (This triggers the FIFO logic in DutyAssignment.save)
            DutyAssignment.objects.create(
                room=obj,
                date=obj.date,
                session=obj.session,
                exam_type=obj.exam_type
            )

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

# Upgraded DutyAssignment from a simple register to a full Admin class
@admin.register(DutyAssignment)
class DutyAssignmentAdmin(admin.ModelAdmin):
    
    def save_model(self, request, obj, form, change):
        # 1. Save the basic duty first
        super().save_model(request, obj, form, change)
        
        # 2. Trigger Auto-Allocation Logic
        # We find the first available staff for this date/session (FIFO)
        available_staff_record = StaffAvailability.objects.filter(
            date=obj.date,
            session=obj.session,
            is_assigned=False
        ).order_by('id').first() # .id order ensures FIFO

        if available_staff_record:
            obj.staff = available_staff_record.staff
            obj.save()
            
            # Mark as assigned
            available_staff_record.is_assigned = True
            available_staff_record.save()
            
            # Update duty count
            obj.staff.duty_count += 1
            obj.staff.save()

        # 3. Handle Balance Staff 
        # (If this was the last room for the day, clear out other available staff)
        # Note: You might want to trigger this only after all rooms are saved