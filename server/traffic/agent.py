from mesa import Agent

class BuildingAgent(Agent):
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass

class RoadAgent(Agent):
    def __init__(self,unique_id, model):
        super().__init__(unique_id, model)
        self.direction = direction

    def step(self):
        pass

# Agent logic will be added...
class TrafficLightAgent(Agent):
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)
    
    def step(self):
        pass

class ObstacleAgent(Agent):
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass