#!/bin/bash
mysql -h $(echo $DATABASE_URL | sed 's/.*@\([^:]*\).*/\1/') -u $(echo $DATABASE_URL | sed 's/.*:\/\/\([^:]*\):.*/\1/') -p$(echo $DATABASE_URL | sed 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/') -D $(echo $DATABASE_URL | sed 's/.*\/\([^?]*\).*/\1/') -e "SELECT id, bookingNumber, tablesRequested, chairsRequested FROM bookings ORDER BY id DESC LIMIT 1;"
