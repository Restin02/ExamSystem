from rest_framework import serializers
from .models import StaffManagement, ClassroomSetup, ExamSchedule, DutyAssignment

# 1. Staff Management Serializer
class StaffManagementSerializer(serializers.ModelSerializer):
    # Using source='user.first_name' to get the name from the linked User model
    name = serializers.CharField(source='user.first_name', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = StaffManagement
        fields = [
            'id', 'staff_id', 'username', 'name', 'department', 
            'branch', 'phone_number', 'grade', 'profile_image', 'duty_count'
        ]

# 2. Classroom Setup Serializer
class ClassroomSetupSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassroomSetup
        fields = '__all__' # Fixed the double "fields =" error here

# 3. Exam Schedule Serializer
class ExamScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamSchedule
        fields = '__all__'

# 4. Duty Assignment Serializer (The most important one for the Dashboard)
class DutyAssignmentSerializer(serializers.ModelSerializer):
    # Fetching descriptive names for the frontend tables
    staff_name = serializers.CharField(source='staff.user.first_name', read_only=True)
    room_name = serializers.CharField(source='room.room_no', read_only=True)
    block_name = serializers.CharField(source='room.block', read_only=True)
    subject = serializers.CharField(source='session.subject', read_only=True)
    exam_date = serializers.DateField(source='session.date', read_only=True)
    time_slot = serializers.CharField(source='session.time_slot', read_only=True)

    class Meta:
        model = DutyAssignment
        fields = [
            'id', 'staff', 'staff_name', 'session', 'subject', 
            'exam_date', 'time_slot', 'room', 'room_name', 'block_name'
        ]