from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from randomAgents.model import RandomModel
from randomAgents.agent import RandomAgent, ObstacleAgent

#Size of the board
number_agents = 10
width = 28
height = 28
randomModel = None
currentStep = 0

# This application will be used to interact with WebGL
app = Flask("Smart city")
cors = CORS(app, origins=['http://localhost'])

#Endpoint to send the parameters of the simulation to the main server

@app.route('/init', methods=['POST'])
@cross_origin()
def initModel():
    
    global currentStep, RandomModel, agentsNumber, width, height

    if request.method == 'POST':
        try:
            agentsNumber = int(request.json.get('agentsNumber'))

            widht = int(request.json.get('width'))

            height = int(request.json.get('height'))

            currentStep = 0

            print('Model parameters: ', {agentsNumber, width, height})

            # Create the model using the parameters sent by the application
            randomModel = RandomModel(agentsNumber, width, height)

            return jsonify
            ({"message":"parameters recived, model initiated."})
        
        except Exception as e:
            print(e)
            return jsonify({"message":"Error initializing the model"}), 500


#Endpoint to get the position of the agents

@app.route('/getAgents', methods =['GET'])
@cross_origin()
def getAgents():
    global randomModel

    if request.method == 'GET':
        try:
            agentPositions = [{"id": str(a.unique_id), "x": x, "y": 1, "z": z}
            for a, (x,z) in randomModel.grid.coord_iter()
            if isinstance(a, CarAgent)
            ]        

            return jsonify
            ({'positions': agentPositions})

        except Exception as e:
            print(e)
            return jsonify({"message":"Error with the agent positions"}), 500


@app.route('/getObstacles', methods=['GET'])
@cross_origin()

def getObstacles():
    global randomModel

    if request.method == 'GET':
        try:
            carPositions = [{
                "id": str(a.unique_id),
                "x": x, 
                "y":1, 
                "z":z}
                for a, (x,z) in randomModel.grid.coord_iter() if isinstance(a, ObstacleAgent)
            ]

            return jsonify({'positions':carPositions})
        
        except Exception as e:
            print(e)
            return jsonify({"message":"Error with obstacle positions"}), 500

@app.route('/update', methods=['GET'])
@cross_origin()
def updateModel():
    global currentStep, randomModel
    if request.method == 'GET':
        try:
            randomModel.step()
            currentStep += 1
            return jsonify
            ({'message':f'Model updated to step {currentStep}.', 'currentStep':currentStep})

        except Exception as e:
            print(e)
            return jsonify({"message":"Error during step."}), 500


if __name__ == '__main__':
    app.run(host='localhost', port 8585, debug=True)





