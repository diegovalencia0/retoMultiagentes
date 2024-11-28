# app.py
# Enrique Martínez de Velasco Reyna
# Diego Valencia Moreno
# 11-28-2024


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


@app.route('/getAgents', methods=['GET'])
@cross_origin()
def getAgents():
    print('/getAgents request')

    global cityModel  

    if request.method == 'GET':
        try:

            agent_positions = []
            
            # Iterate over grid
            for contents, (x, y) in cityModel.grid.coord_iter():
                for agent in contents:
                    if isinstance(agent, Car):
                        #Get actual cell symbol
                        cell_contents = cityModel.grid.get_cell_list_contents((x, y))
                        symbol = next((obj.symbol for obj in cell_contents if hasattr(obj, "symbol")), None)

                        #Place agent position with symbol
                        agent_positions.append({
                            "id": str(agent.unique_id),
                            "x": x,
                            "y": .7,  
                            "z": -y +height +1,  
                            "symbol": symbol if symbol else "?"  
                        })

            print("Agentes encontrados:", agent_positions)
            return jsonify({"positions": agent_positions})
        except Exception as e:
            print(f"Error al procesar las posiciones de los agentes: {e}")
            return jsonify({"message": "Error con las posiciones de los agentes"}), 500


# This route will be used to update the model
@app.route('/update', methods=['GET'])
@cross_origin()
def updateModel():
    print('/update request')
    global currentStep, cityModel
    if request.method == 'GET':
        if cityModel is None:
            return jsonify({'message': 'Model not initialized.'}), 400
        try:
            cityModel.step()
            currentStep += 1
            return jsonify({
                'message': f'Model updated to step {currentStep}.',
                'currentStep': currentStep,
                'agentsArrived': cityModel.agentsArrived,
                'actualAgents': cityModel.actualAgents
            })
        except Exception as e:
            print(f"Error during model update: {e}")
            return jsonify({"message": "Error during step."}), 500



if __name__=='__main__':
    # Run the flask server in port 8585
    app.run(host="localhost", port=8585, debug=True)