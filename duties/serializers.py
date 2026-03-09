from rest_framework import serializers
# Import the new keyword-aligned model names
from .models import StaffManagement, ClassroomSetup, ExamSchedule, DutyAssignment

class StaffManagementSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='user.first_name', read_only=True)
    class Meta:
        model = StaffManagement
        fields = ['id', 'staff_id', 'name', 'department', 'branch', 'phone_number', 'grade']

class ClassroomSetupSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassroomSetup
        fields = fields = '__all__'

class ExamScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamSchedule
        fields = '__all__'

class DutyAssignmentSerializer(serializers.ModelSerializer):
    # This ensures the frontend gets the names, not just IDs
    staff_name = serializers.CharField(source='staff.user.first_name', read_only=True)
    room_name = serializers.CharField(source='room.room_no', read_only=True)
    session_details = serializers.CharField(source='session.subject', read_only=True)

    class Meta:
        model = DutyAssignment
        fields = ['id', 'staff', 'staff_name', 'session', 'session_details', 'room', 'room_name']