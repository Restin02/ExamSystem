from rest_framework import serializers
from .models import StaffProfile, Classroom, ExamSession, DutyAssignment
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']

class StaffSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    class Meta:
        model = StaffProfile
        fields = '__all__'

class DutyAssignmentSerializer(serializers.ModelSerializer):
    staff_name = serializers.ReadOnlyField(source='staff.user.username')
    course = serializers.ReadOnlyField(source='session.course_name')
    room_no = serializers.ReadOnlyField(source='room.room_number')

    class Meta:
        model = DutyAssignment
        fields = '__all__'