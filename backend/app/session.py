_state: dict[tuple[str, str], int] = {}


def current_level(key: tuple[str, str]) -> int:
    return _state.get(key, 0)


def next_level(key: tuple[str, str]) -> int:
    n = _state.get(key, 0)
    _state[key] = n + 1
    return min(n + 1, 4)

def reset(key: tuple[str, str]) -> None:
    _state.pop(key, None)