from mesa import Model
from mesa.time import RandomActivation
from mesa.space import SingleGrid
from .agentsAgent import CarAgent, ObstacleAgent


class CityModel(Model):
    """
    City traffic simulation model.
    """
    def __init__(self, N, width, height, map_data):
        super().__init__()
        self.num_agents = N
        self.grid = SingleGrid(width, height, torus=False)
        self.schedule = RandomActivation(self)
        self.running = True

        self.map_data = map_data  # Map structure as a list of strings
        self.valid_directions = {
            "Up": ["^", "D"],
            "Down": ["v", "D"],
            "Left": ["<", "D"],
            "Right": [">", "D"]
        }

        self.initialize_environment()

    def initialize_environment(self):
        """
        Initialize the grid based on map data.
        """
        for y, row in enumerate(self.map_data):
            for x, cell in enumerate(row):
                if cell == "#":
                    obs = ObstacleAgent(f"o-{x}-{y}", self)
                    self.grid.place_agent(obs, (x, y))
                elif cell == "S":
                    # Spawns can be handled here if needed
                    pass

        # Add initial car agents
        for i in range(self.num_agents):
            start_positions = [
                (x, y) for y, row in enumerate(self.map_data) for x, cell in enumerate(row) if cell == "s"
            ]
            pos = self.random.choice(start_positions)
            direction = self.get_initial_direction(pos)
            car = CarAgent(f"car-{i}", self, direction=direction)
            self.grid.place_agent(car, pos)
            self.schedule.add(car)

    def get_initial_direction(self, pos):
        """
        Determine initial direction based on map data.
        """
        x, y = pos
        cell = self.map_data[y][x]
        if cell == "^":
            return "Up"
        elif cell == "v":
            return "Down"
        elif cell == ">":
            return "Right"
        elif cell == "<":
            return "Left"

    def step(self):
        self.schedule.step()
