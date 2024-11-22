from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from model import CityModel
from agent import *

number_agents = 10
width = 28
height = 28
cityModel = None
currentStep = 0

app = Flask("Traffic example")
cors = CORS(app, origins=['http://localhost'])



@app.route('/init', methods = ['POST'])
@cross_oriigin()
def initModel():
    global currentStep, cityModel, number_agents, width, height

    if request.method == 'POST':
        try:

            number_agents = int(request.json.get('NAgents'))
            width = int(request.json.get('width'))
            height = int(request.json.get('height'))
            currentStep = 0

            print(request.json)
            print(f"Model parameters:{number_agents, width, height}")

            # Create the model using the parameters sent by the application
            randomModel = RandomModel(number_agents, width, height)

            # Return a message to saying that the model was created successfully
            return jsonify({"message":"Parameters recieved, model initiated."})

        except Exception as e:
            print(e)
            return jsonify({"message":"Erorr initializing the model"}), 500







if __name__=='__main__':
    # Run the flask server in port 8585
    app.run(host="localhost", port=8585, debug=True)