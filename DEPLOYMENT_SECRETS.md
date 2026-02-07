# Deployment Secrets

## Aurora PostgreSQL

### Connection String
```
postgresql://username:password@host:port/database
```

### Configuration Details
- **Username**: your_username
- **Password**: your_password
- **Host**: your_host.amazonaws.com
- **Port**: 5432 (default for PostgreSQL)
- **Database**: your_database_name
- **SSL Mode**: require

# Notes

Make sure to set up environment variables for sensitive data instead of hardcoding them in the application.