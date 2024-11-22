from mesa import Model
from mesa.time import RandomActivation
from mesa.space import MultiGrid
from .agent import RoadAgent, TrafficLightAgent, ObstacleAgent, RandomAgent
import json

class RandomModel(Model):
    """
    Creates a new model with random agents.
    Args:
        N: Number of agents in the simulation
        height, width: The size of the grid to model
    """
    def __init__(self, N, width, height):
        super().__init__(seed=42)  # Llamada al constructor de la superclase al inicio

        self.num_agents = N
        self.width = width
        self.height = height

        # Inicialización del grid y el scheduler
        self.grid = MultiGrid(self.width, self.height, torus=False)
        self.schedule = RandomActivation(self)

        # Lectura de datos del archivo JSON
        try:
            dataDictionary = json.load(open("mapDictionary.json"))
        except FileNotFoundError:
            raise FileNotFoundError("El archivo mapDictionary.json no existe en el directorio actual.")

        # Lectura del mapa
        try:
            with open('./cityMap.txt') as baseFile:
                lines = baseFile.readlines()
                self.width = len(lines[0].strip())
                self.height = len(lines)

                # Creación de agentes basados en el archivo de mapa
                for r, row in enumerate(lines):
                    for c, col in enumerate(row.strip()):
                        if col in ["v", "^", ">", "<"]:
                            agent = RoadAgent(f"road_{r*self.width+c}", self)
                        elif col in ["S", "s"]:
                            agent = TrafficLightAgent(f"light_{r*self.width+c}", self)
                        elif col == "#":
                            agent = ObstacleAgent(f"ob_{r*self.width+c}", self)
                        else:
                            continue
                        self.grid.place_agent(agent, (c, self.height - r - 1))
        except FileNotFoundError:
            raise FileNotFoundError("El archivo cityMap.txt no existe en el directorio actual.")

        # Creación de obstáculos en los bordes del grid
        border = [(x, y) for y in range(self.height) for x in range(self.width) if y in [0, self.height - 1] or x in [0, self.width - 1]]
        for i, pos in enumerate(border):
            obs = ObstacleAgent(f"border_{i+1000}", self)
            self.grid.place_agent(obs, pos)

        # Adición de agentes aleatorios
        pos_gen = lambda w, h: (self.random.randrange(w), self.random.randrange(h))
        for i in range(self.num_agents):
            a = RandomAgent(f"agent_{i+1000}", self)
            self.schedule.add(a)

            pos = pos_gen(self.grid.width, self.grid.height)
            while not self.grid.is_cell_empty(pos):
                pos = pos_gen(self.grid.width, self.grid.height)

            self.grid.place_agent(a, pos)

        self.running = True

    def step(self):
        """Avanza la simulación en un paso."""
        self.schedule.step()
