from django.apps import AppConfig

class DutiesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'duties'

    def ready(self):
        import duties.models  # This "wakes up" the signals in models.py