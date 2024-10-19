package world

type ChairModel struct {
	Name  string
	Speed int
}

var (
	ChairModelA = &ChairModel{Name: "A", Speed: 2}
	ChairModelB = &ChairModel{Name: "B", Speed: 3}
	ChairModelC = &ChairModel{Name: "C", Speed: 5}
)
