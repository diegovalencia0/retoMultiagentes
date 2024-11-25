from mesa import Agent

class Car(Agent):
    """
    Agent that respects road directions, traffic lights, and avoids stopped cars using diagonal lane changes.
    """
    def __init__(self, unique_id, model):
        """
        Initializes the Car agent.
        Args:
            unique_id: The agent's ID
            model: Model reference for the agent
        """
        super().__init__(unique_id, model)
        self.waiting = False  # Tracks if the car is waiting at a traffic light
        self.destination = None

    def set_destination(self):
        """Randomly assigns a destination from available destinations in the model."""
        if self.model.destinations:
            self.destination = self.random.choice(self.model.destinations)
            print(f"Car {self.unique_id} has chosen destination at {self.destination.pos}")


    def detect_stopped_car(self, position):
        """
        Detect if there's a stopped car in the given position.
        Args:
            position: Position to check for stopped cars.
        Returns:
            True if a stopped car is detected, False otherwise.
        """
        cell_contents = self.model.grid.get_cell_list_contents(position)
        for agent in cell_contents:
            if isinstance(agent, Car) and agent.waiting:
                return True
        return False

    def is_diagonal_move(self, current_pos, new_pos):
        """
        Check if a move is diagonal.
        Args:
            current_pos: Current position of the agent.
            new_pos: New position to check.
        Returns:
            True if the move is diagonal, False otherwise.
        """
        dx = abs(current_pos[0] - new_pos[0])
        dy = abs(current_pos[1] - new_pos[1])
        return dx == 1 and dy == 1

    def move(self):
        """
        Moves the car while respecting road directions, avoiding traffic lights, and ensuring no collisions with other cars.
        """
        # Get the current position and the neighborhood
        possible_steps = self.model.grid.get_neighborhood(self.pos, moore=True, include_center=False)

        # Filter valid moves based on road direction and detect forward move
        valid_moves = []
        forward_move = None  # Keep track of the forward move

        for step in possible_steps:
            cell_contents = self.model.grid.get_cell_list_contents(step)
            # Include both Road and Traffic_Light agents as valid for movement
            road_or_traffic_agents = [agent for agent in cell_contents if isinstance(agent, (Road, Traffic_Light))]

            if road_or_traffic_agents:
                # Prioritize road direction if the cell contains a Road agent
                road_agents = [agent for agent in road_or_traffic_agents if isinstance(agent, Road)]
                if road_agents:
                    road = road_agents[0]  # Assume one road per cell
                    direction = road.direction

                    # Check if the move aligns with the road's direction
                    if ((direction == "Right" and step[0] > self.pos[0]) or
                        (direction == "Left" and step[0] < self.pos[0]) or
                        (direction == "Down" and step[1] < self.pos[1]) or
                        (direction == "Up" and step[1] > self.pos[1])):
                        forward_move = step
                        valid_moves.append(step)
                else:
                    # Allow movement to Traffic_Light cells without a Road agent
                    valid_moves.append(step)

        # Avoid forward move if another car is in the cell
        if forward_move:
            cell_contents = self.model.grid.get_cell_list_contents(forward_move)
            if any(isinstance(agent, Car) for agent in cell_contents):
                valid_moves.remove(forward_move)  # Exclude the blocked forward move

        # Filter out cells occupied by other cars using isinstance
        valid_moves = [
            move for move in valid_moves
            if not any(isinstance(agent, Car) for agent in self.model.grid.get_cell_list_contents(move))
        ]

        # If no valid moves remain, stop
        if not valid_moves:
            self.waiting = True
            return

        # Select one valid move and check traffic lights
        new_position = self.random.choice(valid_moves)
        cell_contents = self.model.grid.get_cell_list_contents(new_position)

        # Check for traffic lights in the target cell
        traffic_lights = [agent for agent in cell_contents if isinstance(agent, Traffic_Light)]
        if traffic_lights:
            traffic_light = traffic_lights[0]
            if not traffic_light.state:  # Red light
                self.waiting = True  # Mark the car as waiting
                return  # Do not move this step

        # If no red light or light turned green, move to the new position
        self.waiting = False  # Reset waiting state
        self.model.grid.move_agent(self, new_position)


    def step(self):
        """Determines the car's move for the current step."""
        if not self.destination:
            self.set_destination()
        self.move()





class Traffic_Light(Agent):
    """
    Traffic light. Changes state (green/red) based on timeToChange.
    """
    def __init__(self, unique_id, model, state=False, timeToChange=10):
        """
        Creates a new Traffic Light.
        Args:
            unique_id: The agent's ID
            model: Model reference for the agent
            state: Initial state of the traffic light (True for green, False for red)
            timeToChange: Number of steps after which the traffic light toggles
        """
        super().__init__(unique_id, model)
        self.state = state
        self.timeToChange = timeToChange
        self.timer = 0  # Timer to track when to change state

    def step(self):
        """Update the traffic light state based on the timer."""
        self.timer += 1
        if self.timer >= self.timeToChange:
            self.state = not self.state  # Toggle state
            self.timer = 0  # Reset the timer


class Destination(Agent):
    """
    Destination agent. Where each car should go.
    """
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass

class Obstacle(Agent):
    """
    Obstacle agent. Just to add obstacles to the grid.
    """
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass

class Road(Agent):
    """
    Road agent. Determines where the cars can move, and in which direction.
    """
    def __init__(self, unique_id, model, direction= "Left"):
        """
        Creates a new road.
        Args:
            unique_id: The agent's ID
            model: Model reference for the agent
            direction: Direction where the cars can move
        """
        super().__init__(unique_id, model)
        self.direction = direction

    def step(self):
        pass
