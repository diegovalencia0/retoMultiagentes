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


@app.route('/getAgents', methods=['GET'])
@cross_origin()
def getAgents():
    print('/getAgents request')

    global cityModel  # Asegura que cityModel sea accesible globalmente

    if request.method == 'GET':
        try:
            # Lista para almacenar las posiciones de los agentes
            agent_positions = []
            
            # Iterar sobre las celdas de la cuadrícula
            for contents, (x, y) in cityModel.grid.coord_iter():
                for agent in contents:
                    if isinstance(agent, Car):
                        # Obtener el símbolo de la celda actual
                        cell_contents = cityModel.grid.get_cell_list_contents((x, y))
                        symbol = next((obj.symbol for obj in cell_contents if hasattr(obj, "symbol")), None)

                        # Agregar la posición del agente junto con el símbolo
                        agent_positions.append({
                            "id": str(agent.unique_id),
                            "x": x,
                            "y": .7,  # Y fijo (puedes ajustar si no es necesario)
                            "z": y,
                            "symbol": symbol if symbol else "?"  # Valor por defecto "?"
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
                'currentStep': currentStep
            })
        except Exception as e:
            print(f"Error during model update: {e}")
            return jsonify({"message": "Error during step."}), 500



if __name__=='__main__':
    # Run the flask server in port 8585
    app.run(host="localhost", port=8585, debug=True)