from mesa import Model, agent
from mesa.time import RandomActivation
from mesa.space import SingleGrid
from .agent import RandomAgent, ObstacleAgent


class RandomModel(Model):

    def __init__(self, N, width, height):

        super().__init__(seed=42)
        self.num_agents = N

        self.grid = SingleGrid(width, height, torus = False)

        self.schedule = RandomActivation(self)

        self.running = True

        border = [(x,y) for y in range(height) for x in range(width) if y in [0, height-1] or x in [0, width - 1]]

        #Ad obstacles to the grid
        for i, pos in enumerate(border):
            obs = ObstacleAgent(f"o-{i+1000}",self)
            self.grid.place_agent(obs, pos)

        #Function to generate random
        pos_gen = lambda w, h: (self.random.randrange(w), self.random.randrange(h))


        for i in range(self.num_agents):

            a = RandomAgent(f"a-{i+1000}", self) 
            self.schedule.add(a)

            pos = pos_gen(self.grid.width, self.grid.width)

            while (not self.grid.is_cell_empty(pos)):
                pos = pos_gen(self.grid.width, self.grid.height)

            self.grid.place_agent(a, pos)

    def step(self):
        self.schedule.step()