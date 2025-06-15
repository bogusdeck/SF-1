#!/bin/bash

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate  # On Windows: .\venv\Scripts\activate
fi

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export PYTHONPATH=$PYTHONPATH:$(pwd)

# Start the FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
