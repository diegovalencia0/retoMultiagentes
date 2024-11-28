from mesa import Model
from mesa.time import RandomActivation
from mesa.space import MultiGrid
from agent import *
import json

class CityModel(Model):
    """ 
    Creates a model based on a city map.

    Args:
        N: Number of agents in the simulation
    """
    def __init__(self, N):
        # Load the map dictionary. The dictionary maps the characters in the map file to the corresponding agent.
        dataDictionary = json.load(open("../mapDictionary.json"))

        self.traffic_lights = []
        self.num_agents = N
        self.running = True
        self.destinations = []
        self.step_count = 1  # To track the number of steps for periodic agent initialization
        self.arrived = 0

        # Load the map file. The map file is a text file where each character represents an agent.
        with open('../cityMap.txt') as baseFile:
            lines = baseFile.readlines()
            self.width = len(lines[0]) - 1
            self.height = len(lines)

            self.grid = MultiGrid(self.width, self.height, torus=False)
            self.schedule = RandomActivation(self)

            # Goes through each character in the map file and creates the corresponding agent.
            for r, row in enumerate(lines):
                for c, col in enumerate(row):
                    if col in ["v", "^", ">", "<"]:
                        agent = Road(f"r_{r*self.width+c}", self, dataDictionary[col], symbol=col)
                        self.grid.place_agent(agent, (c, self.height - r - 1))


                    elif col in ["S", "s"]:
                        agent = Traffic_Light(f"tl_{r*self.width+c}", self, False if col == "S" else True, int(dataDictionary[col]))
                        self.grid.place_agent(agent, (c, self.height - r - 1))
                        self.schedule.add(agent)
                        self.traffic_lights.append(agent)

                    elif col == "#":
                        agent = Obstacle(f"ob_{r*self.width+c}", self)
                        self.grid.place_agent(agent, (c, self.height - r - 1))

                    elif col == "D":
                        agent = Destination(f"d_{r*self.width+c}", self)
                        self.grid.place_agent(agent, (c, self.height - r - 1))
                        self.destinations.append(agent)
                        self.schedule.add(agent) 
        # Add initial agents at corners
        self.initialize_corner_agents()

    def initialize_corner_agents(self):
        """Add a car to each of the four corners of the grid."""
        corners = [(0, 0), (0, self.height - 1), (self.width - 1, 0), (self.width - 1, self.height - 1)]
        for corner in corners:
            car_id = f"car_{len(self.schedule.agents)}"
            car = Car(car_id, self)
            self.grid.place_agent(car, corner)
            self.schedule.add(car)

    def all_cells_filled_by_cars(self):
        """Verifica si todas las celdas están llenas únicamente por agentes de tipo Car."""
        for contents, (x, y) in self.grid.coord_iter():
            # Verifica si la celda está vacía o no contiene ningún agente 'Car'
            if not any(isinstance(agent, Car) for agent in contents):
                return False
        return True




    def step(self):
        """Advance the model by one step."""
        self.step_count += 1

        # Añadir agentes a las esquinas cada 10 pasos
        if self.step_count % 1 == 0:
            self.initialize_corner_agents()

        # Avanzar la programación de agentes
        self.schedule.step()

        # Verificar si todas las celdas están llenas por agentes Car
        if self.all_cells_filled_by_cars():
            print(f"Modelo detenido en el paso {self.step_count}: todas las celdas están llenas por agentes Car.")
            self.running = False  # Detener el modelo






