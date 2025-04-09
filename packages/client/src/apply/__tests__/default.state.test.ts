import { defaultApplyEvents } from "../default";
import { EventType, StateDeltaEvent, AgentState } from "@agentwire/core";
import { of } from "rxjs";

describe("defaultApplyEvents - State Patching", () => {
  it("should apply state delta patch correctly", (done) => {
    const initialState: AgentState = {
      messages: [],
      state: {
        count: 0,
        text: "hello",
      },
    };

    const stateDelta: StateDeltaEvent = {
      type: EventType.STATE_DELTA,
      delta: [
        { op: "replace", path: "/count", value: 1 },
        { op: "replace", path: "/text", value: "world" },
      ],
    };

    const events$ = of(stateDelta);
    const result$ = defaultApplyEvents(initialState, events$);

    result$.subscribe((update: AgentState) => {
      expect(update.state).toEqual({
        count: 1,
        text: "world",
      });
      done();
    });
  });

  it("should handle nested state updates", (done) => {
    const initialState: AgentState = {
      messages: [],
      state: {
        user: {
          name: "John",
          settings: {
            theme: "light",
          },
        },
      },
    };

    const stateDelta: StateDeltaEvent = {
      type: EventType.STATE_DELTA,
      delta: [{ op: "replace", path: "/user/settings/theme", value: "dark" }],
    };

    const events$ = of(stateDelta);
    const result$ = defaultApplyEvents(initialState, events$);

    result$.subscribe((update: AgentState) => {
      expect(update.state).toEqual({
        user: {
          name: "John",
          settings: {
            theme: "dark",
          },
        },
      });
      done();
    });
  });

  it("should handle array updates", (done) => {
    const initialState: AgentState = {
      messages: [],
      state: {
        items: ["a", "b", "c"],
      },
    };

    const stateDelta: StateDeltaEvent = {
      type: EventType.STATE_DELTA,
      delta: [
        { op: "add", path: "/items/-", value: "d" },
        { op: "replace", path: "/items/0", value: "x" },
      ],
    };

    const events$ = of(stateDelta);
    const result$ = defaultApplyEvents(initialState, events$);

    result$.subscribe((update: AgentState) => {
      expect(update.state).toEqual({
        items: ["x", "b", "c", "d"],
      });
      done();
    });
  });

  it("should handle multiple patches in sequence", (done) => {
    const initialState: AgentState = {
      messages: [],
      state: {
        counter: 0,
      },
    };

    const stateDeltas: StateDeltaEvent[] = [
      {
        type: EventType.STATE_DELTA,
        delta: [{ op: "replace", path: "/counter", value: 1 }],
      },
      {
        type: EventType.STATE_DELTA,
        delta: [{ op: "replace", path: "/counter", value: 2 }],
      },
    ];

    const events$ = of(...stateDeltas);
    const result$ = defaultApplyEvents(initialState, events$);

    let updateCount = 0;
    result$.subscribe((update: AgentState) => {
      updateCount++;
      if (updateCount === 2) {
        expect(update.state).toEqual({
          counter: 2,
        });
        done();
      }
    });
  });

  it("should handle invalid patch operations gracefully", (done) => {
    // Suppress console.warn for this test
    const originalWarn = console.warn;
    console.warn = jest.fn();

    const initialState: AgentState = {
      messages: [],
      state: {
        count: 0,
        text: "hello",
      },
    };

    // Invalid patch: trying to replace a non-existent path
    const stateDelta: StateDeltaEvent = {
      type: EventType.STATE_DELTA,
      delta: [{ op: "replace", path: "/nonexistent", value: 1 }],
    };

    const events$ = of(stateDelta);
    const result$ = defaultApplyEvents(initialState, events$);

    let updateCount = 0;
    result$.subscribe({
      next: (update: AgentState) => {
        updateCount++;
      },
      complete: () => {
        // When patch fails, no updates should be emitted
        expect(updateCount).toBe(0);
        // Restore original console.warn
        console.warn = originalWarn;
        done();
      },
    });
  });
});
