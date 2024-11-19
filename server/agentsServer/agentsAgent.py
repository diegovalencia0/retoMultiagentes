from mesa import Agent


class CarAgent(Agent):
    """
    Car agent that navigates the city grid.
    """
    def __init__(self, unique_id, model, direction=None):
        super().__init__(unique_id, model)
        self.steps_taken = 0
        self.direction = direction  # Initial direction (e.g., "Up", "Down", etc.)
        self.destination_reached = False

    def get_valid_moves(self):
        """
        Get valid moves based on the current direction and grid constraints.
        """
        possible_steps = self.model.grid.get_neighborhood(
            self.pos,
            moore=False,  # Only allow up/down/left/right
            include_center=False
        )

        valid_moves = []
        for step in possible_steps:
            if self.model.grid.is_cell_empty(step):
                x, y = step
                cell = self.model.map_data[y][x]  # Access the map character
                if cell in self.model.valid_directions[self.direction]:
                    valid_moves.append(step)
        return valid_moves

    def move(self):
        """
        Move the agent according to valid moves.
        """
        if self.destination_reached:
            return

        valid_moves = self.get_valid_moves()
        if valid_moves:
            next_move = self.random.choice(valid_moves)
            self.model.grid.move_agent(self, next_move)
            self.steps_taken += 1

            # Check if destination is reached
            x, y = next_move
            if self.model.map_data[y][x] == "D":
                self.destination_reached = True
                self.model.schedule.remove(self)

    def step(self):
        self.move()

class ObstacleAgent(Agent):
    """
    Obstacle agent. Just to add obstacles to the grid.
    """
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass  
