# Secret Folders Game

A multiplayer web-based game where players can join rooms and play together.

## Tech Stack
- Django 4.2
- AngularJS 1.8.2
- PostgreSQL
- Bootstrap 5

## Prerequisites
- Python 3.8+
- Node.js 14+
- PostgreSQL 12+

## Installation

1. Clone the repository
```bash
git clone <repository-url>
cd MKK

2. Create Virtual Envirnment
python -m venv .venv
.venv\Scripts\activate

Install dependencies
pip install -r requirements.txt

Configure database
python manage.py migrate


```
.
├── .venv
├── node_modules
└── SF/
    ├── accounts/
    │   ├── migrations
    │   ├── __init__.py
    │   ├── apps.py
    │   ├── models.py #contains CustomUser
    │   ├── serializers.py
    │   ├── urls.py 
    │   └── views.py
    ├── game/
    │   ├── migrations
    │   ├── __init__.py
    │   ├── apps.py
    │   ├── consumers.py #GameConsumer websocket
    │   ├── models.py #game, gamesession, gameprogress
    │   ├── routing.py #websocket urls patterns
    │   ├── urls.py 
    │   └── views.py
    ├── SF/
    │   ├── __init__.py
    │   ├── asgi.py
    │   ├── settings.py
    │   ├── urls.py
    │   └── wsgi.py
    ├── static/
    │   ├── css  /
    │   │   └── style.css
    │   ├── js/
    │   │   ├── app.js
    │   │   ├── game.js
    │   │   ├── lobby.js
    │   │   └── room.js
    │   └── app.js
    ├── templates/
    │   ├── game/
    │   │   ├── chat.html
    │   │   ├── friends.html
    │   │   ├── lobby.html
    │   │   ├── profile.html
    │   │   └── room.html
    │   ├── base.html
    │   ├── home.html
    │   ├── login.html
    │   └── signup.html
    ├── .env
    ├── db.sqlite3
    ├── manage.py 
    └── requirements.txt
```


Game Management
POST /game/api/host/ - Create new game room
POST /game/api/join/ - Join existing game room
GET /game/api/games/available/ - List available games
GET /game/api/games/<room_id>/players/ - Get players in room
POST /game/api/games/<room_id>/start/ - Start game
User Management
GET /api/friends/ - List friends
POST /api/friends/ - Send friend request
POST /api/friends/<id>/accept/ - Accept friend request