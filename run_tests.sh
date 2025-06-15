#!/bin/bash

# Run all tests
python -m pytest test_room_service.py -v
python -m pytest test_websocket_manager.py -v
python -m pytest test_room_router.py -v

# Run the WebSocket test (requires the server to be running)
echo "\nTo test WebSocket functionality, first start the server with:"
echo "uvicorn main:app --reload"
echo "Then in another terminal, run:"
echo "python test_websocket.py"
