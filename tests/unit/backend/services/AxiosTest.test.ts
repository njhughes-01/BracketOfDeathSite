import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Axios Mock Test", () => {
    it("should be mocked", async () => {
        console.log("axios.post is mock function:", jest.isMockFunction(axios.post));
        mockedAxios.post.mockResolvedValue({ data: "mocked" });
        const res = await axios.post("http://example.com");
        expect(res.data).toBe("mocked");
    });
});
