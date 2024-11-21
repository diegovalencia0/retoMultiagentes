from mesa import Model
from mesa.time import RandomActivation
from mesa.space import MultiGrid
from agent import CarAgent, ObstacleAgent


class RandomModel(Model):
    """ 
    Creates a new model with random agents.
    Args:
        N: Number of agents in the simulation
        height, width: The size of the grid to model
    """
    def __init__(self, N, width, height):
        super().__init__(seed=42)
            
        self.num_agents = N
        self.running = True
        self.schedule = RandomActivation(self)



        #Loaad dictionary with symbology
        cityMap = json.load(open('/dataDictionary.json'))

        #Read map, initialize grid and place respective agents
        with open('/cityMap.txt') as baseFile:
            lines = baseFile.readlines()
            self.width = len(lines[0])-1
            self.height = len(lines)
            self.grid = multigrid(self.width, self.height, torus = False)
            self.schedule = RandomActivation(self)

            # Creates the border of the grid
            border = [(x,y) for y in range(height) for x in range(width) if y in [0, height-1] or x in [0, width - 1]]
            pos_gen = lambda w, h: (self.random.randrange(w), self.random.randrange(h))

            # Add the agent to a random empty grid cell
            for i in range(self.num_agents):

                a = CarAgent(f"a-{i+1000}", self) 
                self.schedule.add(a)

                pos = pos_gen(self.grid.width, self.grid.height)

                while (not self.grid.is_cell_empty(pos)):
                    pos = pos_gen(self.grid.width, self.grid.height)

                self.grid.place_agent(a, pos)

            for r, row in enumerate(lines):
                for c, col in enumerate(row):
                    if col in ["v", "^", ">", "<"]:
                        agent = Road(f"r_{r*self.width+c}", self, dataDictionary[col])
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



    def step(self):
        self.schedule.step()
                    



