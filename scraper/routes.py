# routes.py
# This file defines our basket of routes and their weights
# Weights are based on DGCA passenger traffic data
# Higher weight = more passengers = bigger influence on the national index

ROUTES = [
    {"origin": "DEL", "destination": "BOM", "weight": 12.4, "name": "Delhi → Mumbai"},
    {"origin": "DEL", "destination": "BLR", "weight": 8.6,  "name": "Delhi → Bengaluru"},
    {"origin": "BOM", "destination": "BLR", "weight": 6.2,  "name": "Mumbai → Bengaluru"},
    {"origin": "DEL", "destination": "CCU", "weight": 5.6,  "name": "Delhi → Kolkata"},
    {"origin": "MAA", "destination": "DEL", "weight": 5.2,  "name": "Chennai → Delhi"},
    {"origin": "BLR", "destination": "HYD", "weight": 3.7,  "name": "Bengaluru → Hyderabad"},
    {"origin": "BOM", "destination": "HYD", "weight": 3.3,  "name": "Mumbai → Hyderabad"},
    {"origin": "CCU", "destination": "BOM", "weight": 2.7,  "name": "Kolkata → Mumbai"},
]

# Advance purchase windows (days before travel date)
ADVANCE_WINDOWS = [1, 7, 15, 30, 45]

# Airlines we scrape
AIRLINES = ["indigo", "airindia", "akasa", "spicejet"]

# OTAs we scrape  
OTAS = ["makemytrip"]