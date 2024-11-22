from mesa import Model, agent
from mesa.time import RandomActivation
from mesa.space import MultiGrid
from .agent import *
import json

class RandomModel(Model):
    """ 
    Creates a new model with random agents.
    Args:
        N: Number of agents in the simulation
        height, width: The size of the grid to model
    """
    def __init__(self, N):

        with open("mapDictionary.json", "r") as file: 
            dataDictionary = json.load(file)
        print(dataDictionary)

        with open('cityMap.txt') as baseFile:
            lines = baseFile.readlines()
            self.width = len(lines[0])-1
            self.height = len(lines)

            self.grid = MultiGrid(self.width, self.height, torus = False) 
            self.schedule = RandomActivation(self)

            # Goes through each character in the map file and creates the corresponding agent.
            for r, row in enumerate(lines):
                for c, col in enumerate(row):
                    if col in ["v", "^", ">", "<"]:
                        agent = RoadAgent(f"r_{r*self.width+c}", self)
                        self.grid.place_agent(agent, (c, self.height - r - 1))

                    elif col == '#':
                        agent = ObstacleAgent(f"r_{r*self.width+c}", self)
                        self.grid.place_agent(agent, (c, self.height - r - 1))
                        
                    elif col == "D":
                        agent = DestinationAgent(f"r_{r*self.width+c}", self)
                        self.grid.place_agent(agent, (c, self.height - r - 1))

        self.num_agents = N
        self.running = True

        def step(self):
            self.schedule.step()

              