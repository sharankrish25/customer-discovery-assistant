import { create } from "zustand";
import type { CustomerProfile, Interview } from "@/types/models";

interface StoreState {
  customers: CustomerProfile[];

  addCustomer: (customer: Omit<CustomerProfile, "interviews">) => string;
  addInterview: (customerId: string, interview: Omit<Interview, "customerId">) => string;
  updateInterview: (interviewId: string, patch: Partial<Interview>) => void;
  getInterview: (interviewId: string) => Interview | undefined;
  getInterviewById: (interviewId: string) => Interview | undefined;
  getInterviewsByCustomerId: (customerId: string) => Interview[];
  getCustomerById: (customerId: string) => CustomerProfile | undefined;
  getCustomerByName: (name: string) => CustomerProfile | undefined;

  deleteInterview: (interviewId: string) => void;
  deleteCustomer: (customerId: string) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  customers: [],

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
      customers: state.customers.map((customer) =>
        customer.id === customerId
          ? {
              ...customer,
              updatedAt: new Date(),
              interviews: [
                ...customer.interviews,
                {
                  ...interview,
                  customerId,
                },
              ],
            }
          : customer
      ),
    }));
    return interviewId;
  },

  updateInterview: (interviewId, patch) => {
    set((state) => ({
      customers: state.customers.map((customer) => ({
        ...customer,
        interviews: customer.interviews.map((interview) =>
          interview.id === interviewId
            ? {
                ...interview,
                ...patch,
              }
            : interview
        ),
      })),
    }));
  },

  getInterview: (interviewId) => {
    const state = get();
    for (const customer of state.customers) {
      const interview = customer.interviews.find((item) => item.id === interviewId);
      if (interview) return interview;
    }
    return undefined;
  },

  getInterviewById: (interviewId) => {
    const state = get();
    for (const customer of state.customers) {
      const interview = customer.interviews.find((item) => item.id === interviewId);
      if (interview) return interview;
    }
    return undefined;
  },

  getInterviewsByCustomerId: (customerId) => {
    const state = get();
    const customer = state.customers.find((item) => item.id === customerId);
    return customer ? customer.interviews : [];
  },

  getCustomerById: (customerId) => {
    const state = get();
    return state.customers.find((customer) => customer.id === customerId);
  },

  getCustomerByName: (name) => {
    const state = get();
    return state.customers.find((customer) => customer.name === name);
  },

  deleteInterview: (interviewId) => {
    set((state) => ({
      customers: state.customers.map((customer) => ({
        ...customer,
        interviews: customer.interviews.filter((interview) => interview.id !== interviewId),
        updatedAt: new Date(),
      })),
    }));
  },

  deleteCustomer: (customerId) => {
    set((state) => ({
      customers: state.customers.filter((customer) => customer.id !== customerId),
    }));
  },
}));
