import { create } from "zustand";
import type { CustomerProfile, Interview } from "@/types/models";

interface StoreState {
  customers: CustomerProfile[];
  busyMap: Record<string, boolean>;

  addCustomer: (customer: Omit<CustomerProfile, "interviews">) => string;
  addInterview: (customerId: string, interview: Omit<Interview, "customerId">) => string;
  updateInterview: (interviewId: string, patch: Partial<Interview>) => void;
  getInterview: (interviewId: string) => Interview | undefined;
  getInterviewById: (interviewId: string) => Interview | undefined;
  getInterviewsByCustomerId: (customerId: string) => Interview[];
  getCustomerById: (customerId: string) => CustomerProfile | undefined;
  getCustomerByName: (name: string) => CustomerProfile | undefined;

  setBusy: (id: string, busy: boolean) => void;
  isBusy: (id: string) => boolean;

  deleteInterview: (interviewId: string) => void;
  deleteCustomer: (customerId: string) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  customers: [],
  busyMap: {},

  addCustomer: (customer) => {
    const customerId = customer.id;
    set((state) => ({
      customers: [
        ...state.customers,
        {
          ...customer,
          interviews: [],
        },
      ],
    }));
    return customerId;
  },

  addInterview: (customerId, interview) => {
    const interviewId = interview.id;
    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === customerId
          ? {
              ...c,
              updatedAt: new Date(),
              interviews: [
                ...c.interviews,
                {
                  ...interview,
                  customerId,
                },
              ],
            }
          : c
      ),
    }));
    return interviewId;
  },

  updateInterview: (interviewId, patch) => {
    set((state) => ({
      customers: state.customers.map((c) => ({
        ...c,
        interviews: c.interviews.map((i) =>
          i.id === interviewId
            ? {
                ...i,
                ...patch,
              }
            : i
        ),
      })),
    }));
  },

  getInterview: (interviewId) => {
    const state = get();
    for (const customer of state.customers) {
      const interview = customer.interviews.find((i) => i.id === interviewId);
      if (interview) return interview;
    }
    return undefined;
  },

  getInterviewById: (interviewId) => {
    const state = get();
    for (const customer of state.customers) {
      const interview = customer.interviews.find((i) => i.id === interviewId);
      if (interview) return interview;
    }
    return undefined;
  },

  getInterviewsByCustomerId: (customerId) => {
    const state = get();
    const customer = state.customers.find((c) => c.id === customerId);
    return customer ? customer.interviews : [];
  },

  getCustomerById: (customerId) => {
    const state = get();
    return state.customers.find((c) => c.id === customerId);
  },

  getCustomerByName: (name) => {
    const state = get();
    return state.customers.find((c) => c.name === name);
  },

  setBusy: (id, busy) => {
    set((state) => ({
      busyMap: {
        ...state.busyMap,
        [id]: busy,
      },
    }));
  },

  isBusy: (id) => {
    return get().busyMap[id] || false;
  },

  deleteInterview: (interviewId) => {
    set((state) => ({
      customers: state.customers.map((c) => ({
        ...c,
        interviews: c.interviews.filter((i) => i.id !== interviewId),
        updatedAt: new Date(),
      })),
    }));
  },

  deleteCustomer: (customerId) => {
    set((state) => ({
      customers: state.customers.filter((c) => c.id !== customerId),
    }));
  },
}));
