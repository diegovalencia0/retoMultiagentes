# agent.py
# Enrique Martínez de Velasco Reyna
# Diego Valencia Moreno
# 11-28-2024

from mesa import Agent
from collections import deque

class Car(Agent):

    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)
        self.waiting = False  #Variable to comunicate is at red light
        self.destination = None #Destination cell

"""Alorithm to determine the path to destination"""
    def bfs(self):
        if not self.destination or not self.pos:
            return None

        start = self.pos
        end = self.destination.pos

        if start == end: 
            return [start]

        queue = deque([(start, [start])])
        visited = set()
        visited.add(start)

        while queue:
            current_pos, path = queue.popleft()

            if current_pos == end: #When destination is reached return [start]
                return path

            neighbors = self.model.grid.get_neighborhood(current_pos, moore=True, include_center=False)

            for neighbor in neighbors:
                if neighbor in visited:
                    continue

                if not self.is_valid_move(current_pos, neighbor):
                    continue  # Skip invalid moves based on road direction

                cell_contents = self.model.grid.get_cell_list_contents(neighbor)

                occupied_by_car = any(isinstance(agent, Car) for agent in cell_contents) #Checks if next move cell has a car

                if not occupied_by_car:
                    visited.add(neighbor)
                    queue.append((neighbor, path + [neighbor]))
        return None


    def set_destination(self):
        if self.model.destinations:
            self.destination = self.random.choice(self.model.destinations)

    def move(self):
        if not self.destination:
            return

        path = self.bfs()

        if path and len(path) > 1:
            next_position = path[1]
        else:
            next_position = None

        if next_position and self.is_valid_move(self.pos, next_position):
            cell_contents = self.model.grid.get_cell_list_contents(next_position)

            traffic_lights = [agent for agent in cell_contents if isinstance(agent, Traffic_Light)]
            if traffic_lights and not traffic_lights[0].state:
                self.waiting = True
                return

            if not any(isinstance(agent, Car) for agent in cell_contents):
                self.waiting = False
                self.model.grid.move_agent(self, next_position)
                return
            else:
                self.waiting = True  # Wait if the next cell is occupied by a car
                return
        else:
            self.waiting = True 
            return


    def is_valid_move(self, current_pos, next_pos):
        cell_contents = self.model.grid.get_cell_list_contents(next_pos)
        
        destination_agents = [agent for agent in cell_contents if isinstance(agent, Destination)]
        if destination_agents:
            if self.destination in destination_agents:
                return True
            else:
                return False

        valid_agents = [agent for agent in cell_contents if isinstance(agent, (Road, Traffic_Light))]
        if not valid_agents:
            return False  

        road_agents = [agent for agent in valid_agents if isinstance(agent, Road)]
        if road_agents:
            road = road_agents[0] 
            direction = road.direction

            if direction == "Right" and next_pos[0] > current_pos[0]:
                return True
            if direction == "Left" and next_pos[0] < current_pos[0]:
                return True
            if direction == "Up" and next_pos[1] > current_pos[1]:
                return True
            if direction == "Down" and next_pos[1] < current_pos[1]:
                return True

        # Allow moveement into cells with Traffic Lights
        traffic_light_agents = [agent for agent in valid_agents if isinstance(agent, Traffic_Light)]
        if traffic_light_agents:
            return True

        return False  

    def step(self):
        if self.pos is None:
            return
        if not self.destination:
            self.set_destination()
        self.move()

class Traffic_Light(Agent):

    def __init__(self, unique_id, model, state=False, timeToChange=10, direction = None):
        super().__init__(unique_id, model)
        self.state = state
        self.timeToChange = timeToChange
        self.timer = 0 
        self.direction = direction

    def step(self):
        self.timer += 1
        if self.timer >= self.timeToChange:
            self.state = not self.state  
            self.timer = 0 


class Destination(Agent):
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def remove_agent(self):

        if not self.pos:
            return

        cell_contents = self.model.grid.get_cell_list_contents(self.pos)

        for agent in cell_contents:
            if isinstance(agent, Car) and agent.destination == self:
                self.model.agentsArrived +=1 
                self.model.grid.remove_agent(agent)  
                self.model.schedule.remove(agent)  


    def step(self):
        self.remove_agent()




class Obstacle(Agent):
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass

class Road(Agent):
    """
    Road agent. Determines where the cars can move, and in which direction.
    """
    def __init__(self, unique_id, model, direction= "Left", symbol=None):
        """
        Creates a new road.
        Args:
            unique_id: The agent's ID
            model: Model reference for the agent
            direction: Direction where the cars can move
        """
        super().__init__(unique_id, model)
        self.direction = direction
        self.symbol = symbol

    def step(self):
        pass