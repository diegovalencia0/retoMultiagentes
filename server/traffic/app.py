# TC2008B. Sistemas Multiagentes y Gráficas Computacionales
# Python flask server to interact with webGL.
# Octavio Navarro. 2024

from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from model import CityModel
from agent import *

# Size of the board:
number_agents = 10
width = 28
height = 28
cityModel = None
currentStep = 0

# This application will be used to interact with WebGL
app = Flask("Traffic example")
cors = CORS(app, origins=['http://localhost'])

# This route will be used to send the parameters of the simulation to the server.
# The servers expects a POST request with the parameters in a.json.
@app.route('/init', methods=['POST'])
@cross_origin()
def initModel():
    print('Initializing model')
    global currentStep, cityModel, number_agents, width, height
    if request.method == 'POST':
        try:
            number_agents = int(request.json.get('NAgents'))
            width = int(request.json.get('width'))
            height = int(request.json.get('height'))
            currentStep = 0

            print(request.json)
            print(f"Model parameters: {number_agents, width, height}")

            # Create the CityModel using the parameters sent by the application
            cityModel = CityModel(number_agents)

            return jsonify({"message": "Parameters received, model initiated."})
        except Exception as e:
            print(e)
            return jsonify({"message": "Error initializing the model"}), 500


# This route will be used to get the positions of the agents
@app.route('/getAgents', methods=['GET'])
@cross_origin()
def getAgents():
    print('/getAgents request')

    global cityModel  # Ensure cityModel is available globally

    if request.method == 'GET':
        try:
            # Get the positions of the Car agents
            agent_positions = []
            for contents, (x, y) in cityModel.grid.coord_iter():
                for agent in contents:
                    if isinstance(agent, Car):
                        # Append agent's ID and position
                        agent_positions.append({
                            "id": str(agent.unique_id),
                            "x": x,
                            "y": 1,  
                            "z": y  
                        })

            print(agent_positions)
            return jsonify({"positions": agent_positions})
        except Exception as e:
            print(f"Error: {e}")
            return jsonify({"message": "Error with the agent positions"}), 500


# This route will be used to get the positions of the obstacles
@app.route('/getObstacles', methods=['GET'])
@cross_origin()
def getObstacles():
    global cityModel

    if request.method == 'GET':
        try:
        # Get the positions of the obstacles and return them to WebGL in JSON.json.t.
        # Same as before, the positions are sent as a list of dictionaries, where each dictionary has the id and position of an obstacle.
            carPositions = [
                {"id": str(a.unique_id), "x": x, "y":1, "z":z}
                for a, (x, z) in cityModel.grid.coord_iter() if isinstance(a, ObstacleAgent)
            ]

            return jsonify({'positions':carPositions})
        except Exception as e:
            print(e)
            return jsonify({"message":"Error with obstacle positions"}), 500

# This route will be used to update the model
@app.route('/update', methods=['GET'])
@cross_origin()
def updateModel():
    global currentStep, cityModel
    if request.method == 'GET':
        try:
        # Update the model and return a message to WebGL saying that the model was updated successfully
            cityModel.step()
            currentStep += 1
            return jsonify({'message':f'Model updated to step {currentStep}.', 'currentStep':currentStep})
        except Exception as e:
            print(e)
            return jsonify({"message":"Error during step."}), 500


if __name__=='__main__':
    # Run the flask server in port 8585
    app.run(host="localhost", port=8585, debug=True)
