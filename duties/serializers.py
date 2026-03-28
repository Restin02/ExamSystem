from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    StaffManagement, ClassroomSetup, ExamSchedule, 
    DutyAssignment, StaffAvailability
)

# --- Helper Serializers ---

class AvailabilitySerializer(serializers.ModelSerializer):
    # Map 'exam_date' to 'date'
    date = serializers.DateField(source='exam_date', read_only=True)
    
    # Calculate 'day' name
    day = serializers.SerializerMethodField()
    
    # Pull 'exam_type' from the related session if it exists
    exam_type = serializers.CharField(read_only=True)

    class Meta:
        model = StaffAvailability
        fields = ['date', 'day', 'session', 'exam_type', 'is_available', 'is_assigned']

    def get_day(self, obj):
        # Access the actual model field 'exam_date'
        if hasattr(obj, 'exam_date') and obj.exam_date:
            return obj.exam_date.strftime('%A')
        return ""

class AllocationSerializer(serializers.ModelSerializer):
    # If your model uses ForeignKey for staff/room, 
    # these helper fields make the React table look better
    staff_name = serializers.ReadOnlyField(source='staff.name') 
    
    class Meta:
        model = DutyAssignment 
        fields = '__all__'

class AssignmentSerializer(serializers.ModelSerializer):
    # Mapping 'block' from the ClassroomSetup model
    block = serializers.CharField(source='room.block', read_only=True)
    
    # Mapping 'room_no' from the ClassroomSetup model
    room_no = serializers.CharField(source='room.room_no', read_only=True)
    
    staff_name = serializers.CharField(source='staff.name', read_only=True)
    
    day = serializers.SerializerMethodField()

    class Meta:
        model = DutyAssignment
        fields = ['date', 'day', 'session', 'exam_type', 'room_no', 'block', 'staff_name']

    def get_day(self, obj):
        if obj.date:
            return obj.date.strftime('%A')
        return ""

# --- Main Serializers ---

class StaffManagementSerializer(serializers.ModelSerializer):
    # Get full name from the User model
    name = serializers.SerializerMethodField()
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    image_url = serializers.SerializerMethodField()
    
    # NEW: Added for the "Allocated/Not Allocated" status in React
    status = serializers.SerializerMethodField()

    class Meta:
        model = StaffManagement
        fields = [
            'id', 'user', 'name', 'username', 'email', 'staff_id', 
            'grade', 'department', 'branch', 'phone_number',
            'internal1_duty_count', 'internal2_duty_count', 
            'regular_duty_count', 'supply_duty_count', 'image_url', 'status'
        ]

    def get_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username

    def get_image_url(self, obj):
        image_field = getattr(obj, 'profile_pic', getattr(obj, 'image', None))
        if image_field and hasattr(image_field, 'url'):
            return image_field.url 
        return None

    def get_status(self, obj):
        # Retrieve date and session from context sent by the view
        date = self.context.get('date')
        session = self.context.get('session')
        if date and session:
            record = StaffAvailability.objects.filter(
                staff=obj.user, 
                exam_date=date, 
                session=session
            ).first()
            if record and record.is_assigned:
                return "Allocated"
        return "Not Allocated"

class ClassroomSetupSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassroomSetup
        fields = '__all__' 

class ExamScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamSchedule
        fields = '__all__'

class DutyAssignmentSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.user.get_full_name', read_only=True)
    department = serializers.CharField(source='staff.department', read_only=True)
    branch = serializers.CharField(source='staff.branch', read_only=True)
    grade = serializers.CharField(source='staff.grade', read_only=True)
    room_name = serializers.CharField(source='room.room_no', read_only=True)
    block_name = serializers.CharField(source='room.block', read_only=True)
    subject = serializers.CharField(source='exam_schedule.subject', read_only=True)
    
    # Snapshot fields
    exam_date = serializers.DateField(source='date', read_only=True)
    exam_session = serializers.CharField(source='session', read_only=True)

    class Meta:
        model = DutyAssignment
        fields = [
            'id', 'staff', 'staff_name', 'department', 'branch', 'grade',
            'exam_schedule', 'subject', 'date', 'exam_date', 'session', 'exam_session', 
            'exam_type', 'room', 'room_name', 'block_name'
        ]

class StaffProfileSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    email = serializers.EmailField(source='user.email', read_only=True)
    image_url = serializers.SerializerMethodField()
    
    # Status field for individual profile view context
    status = serializers.SerializerMethodField()
    
    profile_pic = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = StaffManagement
        fields = [
            'name', 'staff_id', 'department', 'branch', 'grade', 
            'phone_number', 'email', 'image_url', 'status',
            'internal1_duty_count', 'internal2_duty_count', 
            'regular_duty_count', 'supply_duty_count'
        ]
        read_only_fields = ['staff_id', 'internal1_duty_count', 'internal2_duty_count', 'regular_duty_count', 'supply_duty_count']

    def get_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()

    def get_image_url(self, obj):
        image_field = getattr(obj, 'profile_pic', getattr(obj, 'image', None))
        if image_field and hasattr(image_field, 'url'):
            return image_field.url 
        return None

    def get_status(self, obj):
        date = self.context.get('date')
        session = self.context.get('session')
        if date and session:
            record = StaffAvailability.objects.filter(
                staff=obj.user, 
                exam_date=date, 
                session=session
            ).first()
            return "Allocated" if (record and record.is_assigned) else "Not Allocated"
        return "N/A"