from mesa import Agent

class RandomAgent(Agent):
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)
        self.steps_taken = 0

    def move(self):
        possible_steps = self.model.grid.get_neighborhood(
            self.pos,
            moore=True,
            include_center=True

        freeSpaces = list(map(self.model.grid.is_cell_empty, possible_steps))

        next_moves = [p for p,f in zip (possible_steps)
 ]